module.exports = {
  censor(str, uncensoredLen, censoredLen, censorshipChar='*') {
    if (str == null) {
      return str;
    } else {
      return str.toString().substring(0, uncensoredLen)
          + new Array(censoredLen + 1).join(censorshipChar);
    }
  },

  isCensored(value, censorshipChar='*') {
    let testStr = censorshipChar + censorshipChar;
    return typeof value == 'string' && value.indexOf(testStr) != -1;
  },
};
