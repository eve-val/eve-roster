const Promise = require('bluebird');
const path = require('path');
const postcss = require('postcss');
const cssParser = require('postcss-selector-parser');
const readCache = require('read-cache');
const _ = require('underscore');

module.exports = postcss.plugin('postcss-insert', insertWithPrefix);

function insertWithPrefix(options) {
  // Make sure options is non-null
  options = Object.assign({ plugins: [] }, options);
  return function(css, result) {
    return processCSS(css, result, options, true);
  }
}

function processCSS(css, result, options, logWarnings) {
  return getInsertNodes(css, result)
    .then((inserts) => {
      return Promise.map(inserts, node => {
        return loadInsertedContent(node, result, options);
      });
    })
    .then((inserts) => {
      inserts.forEach(n => {
        if (n.contents) {
          n.node.replaceWith(n.contents);
        } else {
          n.node.remove();
        }
      });
    })
    .then(() => {
      if (logWarnings) {
        result.warnings().forEach(msg => {
          console.warn(msg.toString());
        });
      }

      return css;
    });
}

function getInsertNodes(css, result) {
  return Promise.resolve()
    .then(() => {
      let work = [];

      css.walkAtRules('insert', (node) => {
        let params = parseParams(node, result);

        if (node.nodes) {
          result.warn('@insert: has attached child nodes, make sure to end with ";" and do not use a "{}" block with it',
            {node: node});
        } else if (params.length < 1 || params.length > 3) {
          result.warn('@insert: expected between 1 to 3 parameters [file, prefix, filters]', {node: node});
        } else if (params[0].length == 0) {
          result.warn('@insert: path parameter cannot be empty', {node: node});
        } else {
          work.push({ node: node, params: params });
        }
      });

      return work;
    });
}

function parseParams(node, result) {
  if (!node.params || !_.isString(node.params)) {
    return [];
  }

  let parsed = [];
  let buffer = [];
  let inQuote = false;

  for (let i = 0; i < node.params.length; i++) {
    let c = node.params[i];

    if (c == '"') {
      // Start or end quoted section (doesn't end the parameter though, still
      // requires another space afterwards)
      inQuote = !inQuote;
    } else if (c == ' ') {
      // Space so end the parameter if there is no opened quote
      if (!inQuote) {
        parsed.push(buffer.join(''));
        buffer = [];
      } else {
        // Include unescaped space in the buffer
        buffer.push(' ');
      }
    } else if (c == '\\') {
      // Allow for escaping un-paired double quotes and escaped spaces
      if (i < paramString.length - 1) {
        if (paramString[i + 1] == '"' || paramString[i + 1] == ' ') {
          // Just push the character, advance i, and avoid subsequent special behavior
          buffer.push(c);
          i++;
        }
      } else {
        // Just insert the backslash
        buffer.push('\\');
      }
    } else {
      // Append character
      buffer.push(c);
    }
  }

  if (inQuote) {
    // Unpaired unescaped quote, so just issue a warning
    result.warn('@insert: mismatched quote in parameter, ignoring', {node: node});
  }
  // Push remaining parameters
  if (buffer.length > 0) {
    parsed.push(buffer.join(''));
  }

  return parsed;
}

function parseCSS(filename, result, options) {
  // Inherit plugins
  let plugins = options.plugins;
  // And parsers
  let parsers = [];
  if (result.opts.syntax && result.opts.syntax.parse) {
    parsers.push(result.opts.syntax.parse);
  }
  if (result.opts.parser) {
    parsers.push(result.opts.parser);
  }
  // Default parser
  parsers.push(null);

  let _parse = function(content, index) {
    if (!index) {
      index = 0;
    }
    return postcss(plugins).process(content, {
      from: filename, parser: parsers[index]
    })
    .catch((err) => {
      // Try the next parser in the event of an error, or rethrow if there are no more errors
      if (index >= parsers.length - 1) {
        throw err;
      } else {
        return _parse(content, index + 1);
      }
    });
  };

  return readCache(filename, 'utf-8').then(_parse);
}

function updateRules(css, prefix, filter, result) {
  let selectorParser = cssParser((selectors) => {
    // Accumulate selectors
    let newSelectors = [];
    selectors.each(s => {
      // Check if s contains a class matching any filter to pass
      if (filter) {
        // Walking is aborted when false is returned, so the includes is negated,
        // so when true is returned, no classes on the selector were in filter
        if (s.walkClasses(e => !filter.includes(e.value)) !== false) {
          return;
        }
      }

      // Depending on the type of the first selector, push the class name at the front
      // or at the end (e.g. div.name instead of .namediv)
      let insert = s.insertBefore;
      if (s.at(0).type == 'tag') {
        insert = s.insertAfter;
      }

      let prefixParser = cssParser((prefixes) => {
        prefixes.each(p => {
          // Check elements of the prefix css to make sure they are only classes
          p.each(e => {
            if (e.type != 'class') {
              throw 'Prefix can only be made of class selectors';
            }
          });

          // Make a version where the prefix is applied to the rule (e.g. adding the
          // prefix to required classes for the element)
          let sNew = s.clone();
          for (let i = p.nodes.length - 1; i >= 0; i--) {
            insert.apply(sNew, [sNew.at(0), p.at(i).clone()]);
          }
          newSelectors.push(sNew);

          // Make a version where the original rule is a descendant of the prefix
          sNew = s.clone();
          sNew.prepend(cssParser.combinator({value: ' '}));
          for (let i = p.nodes.length - 1; i >= 0; i--) {
            sNew.prepend(p.at(i).clone());
          }
          newSelectors.push(sNew);
        });
      });

      prefixParser.process(prefix, {lossless: false});
    });

    // Replace selectors with the updated list that has the cloned rules with each
    // prefix element in it.
    selectors.removeAll();
    for (let s of newSelectors) {
      selectors.append(s);
    }
  });

  // Process all rules in the css document
  css.walkRules(rule => {
    rule.selector = selectorParser.process(rule.selector, {lossless: false}).result;

    if (rule.selector == '') {
      rule.remove();
    }
  });

  // Now filter out any at rules (such as @media) that are now empty
  css.walkAtRules(rule => {
    if (!rule.nodes || rule.nodes.length == 0) {
      rule.remove();
    }
  });

  return css;
}

function loadInsertedContent(insertAtRule, result, options) {
  let file = '';
  if (insertAtRule.params[0][0] == '/') {
    // Absolute file
    file = insertAtRule.params[0];
  } else {
    // Try and concatenate relative to css source, and then this file
    let base = '';
    if (insertAtRule.node.source && insertAtRule.node.source.input &&
        insertAtRule.node.source.input.file) {
      base = path.dirname(insertAtRule.node.source.input.file);
    } else {
      result.warn('@insert: no source file associated with parent css, resolving insert relative to plugin path');
      base = __dirname;
    }

    file = path.join(base, insertAtRule.params[0]);
  }

  return parseCSS(file, result, options)
    .then(newResult => {
      // Include messages into result
      result.messages = result.messages.concat(newResult.messages);

      // Recurse so that new CSS can also use @insert
      return processCSS(newResult.root, result, options, false);
    })
    .then(resolved => {
      if (insertAtRule.params.length > 1) {
        // Has a prefix to adjust and/or a filter
        let filters = null;
        if (insertAtRule.params.length > 2) {
          filters = insertAtRule.params[2].split(' ');
        }
        resolved = updateRules(resolved, insertAtRule.params[1], filters, result);
      }

      return {node: insertAtRule.node, contents: resolved};
    })
    .catch(error => {
      // Check if it's a file-not-found exception, in which case just skip the insert
      if (!error.message || error.message.indexOf("no such file") < 0) {
        throw error;
      } else {
        result.warn('@insert: unable to find ' + file, {node: insertAtRule.node});
        return { node: insertAtRule.node, contents: null };
      }
    });
}