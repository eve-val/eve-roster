const Promise = require('bluebird');
const axios = require('axios');
const path = require('path');
const postcss = require('postcss');
const cssParser = require('postcss-selector-parser');
const valueParser = require('postcss-value-parser');
const readCache = require('read-cache');
const _ = require('underscore');

const PLUGIN_NAME = 'postcss-filter-guard';
const AT_RULE = '-x-filter';

module.exports = postcss.plugin(PLUGIN_NAME, makePlugin);

function makePlugin(options) {
  // Make sure options is non-null
  options = Object.assign({ plugins: [] }, options);
  return function(css, result) {
    return processCSS(css, result, options, true);
  }
}

function processCSS(css, result, options, logWarnings) {
  return getFilterNodes(css, result)
    .then((inserts) => {
      return Promise.map(inserts, node => {
        return loadAndFilterContent(node, result, options);
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
        let block = [];

        result.warnings().forEach(msg => {
          block.push(msg.toString());
        });

        if (options.failOnWarning) {
          throw new Error('ERROR: warnings encountered while processing (failOnWarning is enabled):\n' + block.join('\n'));
        } else {
          console.log(block.join('\n'));
        }
      }

      return css;
    });
}

function getFilterNodes(css, result) {
  return Promise.resolve()
    .then(() => {
      let work = [];

      css.walkAtRules(AT_RULE, (node) => {
        let params = parseParams(node, result);
        if (params) {
          work.push({node: node, params: params});
        }
      });

      return work;
    });
}

function parseParams(node, result) {
  if (!node.params || !_.isString(node.params)) {
    reuslt.warn(PLUGIN_NAME + ': no parameters provided to at rule');
    return null;
  }

  let parsed = valueParser(node.params);
  if (parsed.nodes.length != 1 || parsed.nodes[0].type != 'function') {
    result.warn(PLUGIN_NAME + ': expected parameters within a function after at rule');
    return null;
  }

  let spec = {
    path: '',
    prefix: '',
    filter: {
      acceptClasses: [],
      acceptTags: [],
      rejectClasses: []
    }
  };

  let params = parsed.nodes[0].nodes.filter(n => n.type != 'div' && n.value != ',');
  if (params.length < 1 || params.length > 3) {
    result.warn(PLUGIN_NAME + ': function requires between 1 and 3 parameters, but got ' + params.length);
    return null;
  }

  // Extract path from URL function
  if (params[0].type == 'function' && params[0].value == 'url' && params[0].nodes.length == 1) {
    let url = params[0].nodes[0];
    spec.path = url.value;
  } else {
    result.warn(PLUGIN_NAME + ': expected url(path) as first parameter');
    return null;
  }

  // Extract prefix from next parameter
  if (params.length > 1) {
    if (params[1].type == 'word' || params[1].type == 'string') {
      spec.prefix = params[1].value;
    } else if (params[1].type != 'space') {
      // Anything other than a space (which is interpreted as skipping optional parameter) is unknown
      result.warn(PLUGIN_NAME + ': unsupported type in second parameter');
      return null;
    }
  }

  // Extract filter from next parameter
  if (params.length > 2) {
    let rawFilter = null;
    if (params[2].type == 'word' || params[2].type == 'string') {
      rawFilter = params[2].value;
    } else if (params[2].type != 'space') {
      result.warn(PLUGIN_NAME + ': unsupported type in third parameter');
      return null;
    }

    if (rawFilter) {
      for (let r of rawFilter.split(' ')) {
        if (r.length == 0) continue;

        let negate = r[0] == '!';
        if (negate) {
          r = r.substr(1);
        }

        let isClass = r[0] == '.';
        if (isClass) {
          r = r.substr(1);
        }

        if (r.length > 0) {
          if (isClass) {
            if (negate) {
              spec.filter.rejectClasses.push(r);
            } else {
              spec.filter.acceptClasses.push(r);
            }
          } else if (!negate) {
            spec.filter.acceptTags.push(r);
          } else {
            result.warn(PLUGIN_NAME + ': rejecting based on tags is unsupported, ignoring');
          }
        } else {
          result.warn(PLUGIN_NAME + ': skipping malformed filter rule, ' + r);
        }
      }
    }
  }

  return spec;
}

// Run the contents of the file through postcss and return the parsed AST on success (as a promise)
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

  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    // Fetch remote content
    return axios.get(filename).then(content => content.data).then(_parse);
  } else {
    return readCache(filename, 'utf-8').then(_parse);
  }
}

function validateGuardPrefix(prefix) {
  // Make sure that each element in the prefix selector is a class rule
  prefix.each(e => {
    if (e.type != 'class') {
      throw new Error('Prefix can only be made of class selectors');
    }
  });
}

// Makes a copy of selector with the prefix class selector as an additional required class
// on the first element of selector.
function makeRegularGuardRule(selector, prefix) {
  let newSelector = selector.clone();

  // Copy all the elements in the prefix rule into the first part of the selector,
  // pushing it at the very front if dealing with most selector types or right after
  // a tag if the rule starts with an html tag. (e.g. make div.prefix instead of .prefixdiv)
  for (let i = prefix.length - 1; i >= 0; i--) {
    if (selector.at(0).type == 'tag') {
      newSelector.insertAfter(newSelector.at(0), prefix.at(i).clone());
    } else {
      newSelector.insertBefore(newSelector.at(0), prefix.at(i).clone());
    }
  }

  return newSelector;
}

// Makes a copy of selector with the prefix class selector used as a parent rule
// in a descendent combinator.
function makeDescendantGuardRule(selector, prefix) {
  let newSelector = selector.clone();

  // First add the combinator, which because we're prepending will end up between the
  // start of the original rule and the end of the prefix.
  newSelector.prepend(cssParser.combinator({value: ' '}));
  for (let i = prefix.length - 1; i >= 0; i--) {
    newSelector.prepend(prefix.at(i).clone());
  }

  return newSelector;
}

function makeGuardRules(selector, prefixes) {
  let newRules = [];
  let parser = cssParser((result) => {
    // Validate and add rules for each parsed prefix (which splits on commas, etc)
    result.each(prefix => {
      validateGuardPrefix(prefix);
      newRules.push(makeRegularGuardRule(selector, prefix));
      newRules.push(makeDescendantGuardRule(selector, prefix));
    });
  });

  parser.process(prefixes, {lossless: false});
  return newRules;
}

function isFiltered(selector, filter) {
  // Default filtered state is to filter if there are accept rules, but to not filter if there are only reject rules
  let filtered = filter.acceptClasses.length > 0 || filter.acceptTags.length > 0;

  // First see if selector has any classes that match an allowed filter class
  if (filtered && filter.acceptClasses.length > 0) {
    // Walking is aborted when false is returned, so the includes is negated so that walking
    // stops when an accepted class was encountered
    if (selector.walkClasses(e => !filter.acceptClasses.includes(e.value)) === false) {
      // Since an accepted class was found, this rule won't be filtered
      filtered = false;
    }
  }

  // Second see if selector is one of the allowed plain tags. This rule only accepts selectors that
  // are just the tag (no added classes, no combinators, or pseudo-classes, etc)
  if (filtered && filter.acceptTags.length > 0) {
    if (selector.length == 1 && selector.at(0).type == 'tag' && filter.acceptTags.includes(selector.at(0).value)) {
      filtered = false;
    }
  }

  // Next see if selector has any classes that would reject it
  if (!filtered && filter.rejectClasses.length > 0) {
    if (selector.walkClasses(e => !filter.rejectClasses.includes(e.value)) == false) {
      filtered = true;
    }
  }

  return filtered;
}

function filterGuardRule(rule, prefix, filter) {
  let parser = cssParser((result) => {
    // Accumulate all new selector rules
    let newSelectors = [];
    result.each(selector => {
      if (isFiltered(selector, filter)) {
        return;
      }

      newSelectors = newSelectors.concat(makeGuardRules(selector, prefix));
    });

    // Replace old selectors with the new ones
    result.removeAll();
    for (let s of newSelectors) {
      result.append(s);
    }
  });

  return parser.process(rule, {lossless: false}).result;
}


function updateRules(css, prefix, filter, result) {
  // Process all rules in the css document
  css.walkRules(rule => {
    rule.selector = filterGuardRule(rule.selector, prefix, filter);

    if (rule.selector == '') {
      rule.remove();
    }
  });

  // Now filter out any at rules (such as @media) that are now empty
  css.walkAtRules(rule => {
    if (!rule.nodes || rule.nodes.length == 0) {
      rule.remove();
      return;
    }

    // Remove @rules that don't have any selectors in them (and hence couldn't
    // have passed the filter)
    if (filter.acceptClasses.length > 0 || filter.acceptTags.length > 0) {
      let onlyDecls = true;
      rule.walk(e => {
        if (e.type != 'decl') {
          onlyDecls = false;
          return false;
        }
      });
      if (onlyDecls) {
        rule.remove();
      }
    }
  });

  return css;
}

function loadAndFilterContent(insertAtRule, result, options) {
  let file = '';
  if (insertAtRule.params.path[0] == '/' || insertAtRule.params.path.startsWith('http://')
      || insertAtRule.params.path.startsWith('https://')) {
    // Absolute file or URL
    file = insertAtRule.params.path;
  } else {
    // Try and concatenate relative to css source, and then this file
    let base = '';
    if (insertAtRule.node.source && insertAtRule.node.source.input &&
        insertAtRule.node.source.input.file) {
      base = path.dirname(insertAtRule.node.source.input.file);
    } else {
      result.warn(PLUGIN_NAME + ': no source file associated with parent css, resolving relative to plugin path');
      base = __dirname;
    }

    file = path.join(base, insertAtRule.params.path);
  }

  return parseCSS(file, result, options)
    .then(newResult => {
      // Include messages into result
      result.messages = result.messages.concat(newResult.messages);

      // Recurse so that new CSS can also use filtering
      return processCSS(newResult.root, result, options, false);
    })
    .then(resolved => {
      if (insertAtRule.node.nodes.length > 0) {
        // Include all extra content into the loaded CSS before updating it
        for (let i = 0; i < insertAtRule.node.nodes.length; i++) {
          resolved.append(insertAtRule.node.nodes[i].clone());
        }
      }

      // Now filter and add prefix guard
      resolved = updateRules(resolved, insertAtRule.params.prefix, insertAtRule.params.filter, result);
      return {node: insertAtRule.node, contents: resolved};
    })
    .catch(error => {
      // Check if it's a file-not-found exception, in which case just skip the insert
      if (!error.message || error.message.indexOf("no such file") < 0) {
        throw error;
      } else {
        result.warn(PLUGIN_NAME + ': unable to find ' + file, {node: insertAtRule.node});
        return { node: insertAtRule.node, contents: null };
      }
    });
}