// Wrap scribe-js with some defined loggers and conditional logging
// USAGE: require('util/logger')('name').fatal/error/warn/info/debug/trace(...)

const path = require('path');
const config = require('../util/config');

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
let logDir = process.env.LOG_DIR;
if (logDir && logDir[0] != '/') {
  // A relative path
  logDir = path.join(__dirname, '../../', logDir);
}

let CONSOLE;
if (logDir) {
  // Only log to the actual console when not in production, when in production
  // only log to the web portal.
  CONSOLE = scribe.console({
    console: { logInConsole: config.isDevelopment() },
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

// Convenience function to allow passing in __filename and turn it into a
// nice set of tags
const srcRoot = path.join(__dirname, '..');
const binRoot = path.join(__dirname, '../../bin');
function getNameFromFile(fileName) {
  if (!fileName) {
    return '';
  }

  let isFile = false;
  if (fileName.startsWith(srcRoot)) {
    fileName = fileName.substring(srcRoot.length + 1);
    isFile = true;
  } else if (fileName.startsWith(binRoot)) {
    fileName = fileName.substring(binRoot.length + 1);
    isFile = true;
  }

  if (fileName.endsWith('.js')) {
    fileName = fileName.substring(0, fileName.length - 3);
    isFile = true;
  }

  if (isFile) {
    return fileName.replace(/\//g, '.');
  } else {
    return fileName;
  }
}

// A friendlier interface for logging to the defined log levels, which handles
// error stack traces, child loggers, and log level suppression.
class Logger {
  constructor(name = '') {
    let finalName = getNameFromFile(name);

    // Split by '.' and then remove duplicates (such as resulting from
    // cron/cron.js) but handle generally here since the web panel glitches out
    // on duplicate tags anyways (otherwise we could just override cron's logger
    // name). Set preserves insertion order so Array.from(Set) just removes
    // duplicates but maintains same order.
    this._tags = finalName ? Array.from(new Set(finalName.split('.'))) : [];
  }

  childLogger(name) {
    return new Logger(this._tags.join('.') + name);
  }

  webPanel() {
    return scribe.webPanel();
  }

  _isLevelLogged(level) {
    const logLevel = process.env.LOG_LEVEL || 'trace';
    return LOGGER_PRIORITY[logLevel] <= LOGGER_PRIORITY[level];
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
    if (this._tags.length > 0) {
      CONSOLE.time().tag(...this._tags)[level](...message);
    } else {
      CONSOLE.time()[level](...message);
    }

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

module.exports = name => new Logger(name);
