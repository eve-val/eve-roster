// Wrap scribe-js with some defined loggers and conditional logging
// USAGE: require('util/logger')('name').fatal/error/warn/info/debug/trace(...)

const path = require('path');
const CONFIG = require('../config-loader').load();

// Import the scribe-js module with the given root log directory
// (and don't have it create process.console since that's not how we'll use it)
const scribe = require('scribe-js')({
  createDefaultConsole: false
});
// The default LogWriter provided by scribe asynchronously writes events to its
// directory. For fatal errors that must terminate the process, the exit must
// happen after the write finishes, so this class provides such functionality.
class FatalLogWriter extends scribe.LogWriter {
  constructor(rootPath) {
    super(rootPath);
  }

  save(log, opt) {
    // Override original save to call process.exit() in the callback after the
    // log entry has been asynchronously written to disk (otherwise this code is
    // taken from logWriter.js). This was deemed less invasive than overriding
    // everything to force it to use synchronous IO operations.

    try {
      delete log.opt; //we save logger options in rootPath/[logger].json
    } catch(e){
      // ignore
    }

    let json = JSON.stringify(log);

    this.appendFile(this.path(opt), json + '\n', function(err) {
      if (log.type == 'fatal') {
        if (err) {
          // Log to the actual console since the process is dying anyways
          console.error('Error saving fatal log entry');
          console.error(err);
        }
        process.exit(2);
      } else if (err) {
        // Not a fatal error, so just throw the exception (which may create
        // a fatal error...)
        throw err;
      }
    });
  }
}



// Create a shared console that is used by all instances of Logger, with a
// custom FatalLogWriter to handle killing the process when fatal() is saved.
let logDir = CONFIG.logDir;
if (logDir && logDir[0] != '/') {
  // A relative path, make it relative to back-end/
  logDir = path.join(__dirname, '../../', logDir);
}

let CONSOLE;
if (logDir) {
  // Only log to the actual console when not in production, when in production
  // only log to the web portal.
  CONSOLE = scribe.console({
    console: { logInConsole: CONFIG.serveMode != 'production' },
    createBasic: false
  }, new FatalLogWriter(logDir));
} else {
  CONSOLE = scribe.console({
    console: { logInConsole: true },
    createBasic: false,
    logWriter: false
  });
}

// The loggers on the console with their color configuration
const LOGGERS = {
  'fatal': ['yellow', 'bgRed', 'bold'],
  'error': ['white', 'bgRed', 'bold'],
  'warn': ['yellow', 'bgYellow', 'bold'],
  'info': [ 'white', 'bgWhite', 'bold'],
  'debug': ['white', 'bold'],
  'trace': ['gray', 'bold']
};
const LOGGER_PRIORITY = {
  'fatal': 999,
  'error': 99,
  'warn': 9,
  'info': 2,
  'debug': 1,
  'trace': 0
};

// Install the loggers, with some additional coloring configuration
Object.keys(LOGGERS).forEach(logger => {
  CONSOLE.addLogger(logger, [], {
    defaultTags: [
      {
        msg: logger.toUpperCase(),
        colors: LOGGERS[logger]
      }
    ],
    tagsColors: ['white'],
    timeColors: ['gray', 'italic']
  });
});

// Set to true once any logger calls fatal() so that no future log calls are
// made, even when waiting for the asynchronous file writes to finish.
let hasFatalError = false;

// A friendlier interface for logging to the defined log levels, which handles
// error stack traces, child loggers, and log level suppression.
class Logger {
  constructor(name, parentLogger = null) {
    let tags;
    if (parentLogger) {
      tags = [...parentLogger._tags];
    } else {
      tags = [];
    }
    tags.push(name);

    this._tags = tags;

    // Cache the log level for the time being, since with configuration tied
    // to a file loaded at startup, this won't be able to change during an
    // application's lifetime.
    let levelKey = tags.join('.');
    if (levelKey in CONFIG.logLevels) {
      this._logLevel = CONFIG.logLevels[levelKey];
    } else if (parentLogger) {
      // Inherit level
      this._logLevel = parentLogger._logLevel;
    } else if ('root' in CONFIG.logLevels) {
      // Check default level
      this._logLevel = CONFIG.logLevels['root'];
    } else {
      // Default to info
      this._logLevel = 'info';
    }
  }

  childLogger(name) {
    return new Logger(name, this);
  }

  _isLevelLogged(level) {
    return LOGGER_PRIORITY[this._logLevel] <= LOGGER_PRIORITY[level];
  }

  _log(level = 'info', ...message) {
    if (hasFatalError || !this._isLevelLogged(level)) {
      return;
    }

    // Hack in better support for errors by replacing the object with its
    // stack member
    for (let i = 0; i < message.length; i++) {
      let arg = message[i];
      if (arg instanceof Error && arg.stack) {
        message[i] = arg.stack.split('\n');
      }
    }

    // The alwaysTime config option doesn't seem to work so explicitly always
    // add the time And don't use alwaysTags because this._tags changes based on
    // the logger (but this way we don't need to create multiple console
    // instances).
    CONSOLE.time().tag(...this._tags)[level](...message);

    if (level == 'fatal') {
      hasFatalError = true;
      if (!logDir) {
        // There is no FatalLogWriter handling termination in this case
        process.exit(2);
      }
    }
  }

  fatal(...message) {
    this._log('fatal', ...message);
  }

  error(...message) {
    this._log('error', ...message);
  }

  warn(...message) {
    this._log('warn', ...message);
  }

  info(...message) {
    this._log('info', ...message);
  }

  debug(...message) {
    this._log('debug', ...message);
  }

  trace(...message) {
    this._log('trace', ...message);
  }
}

module.exports = Logger;
