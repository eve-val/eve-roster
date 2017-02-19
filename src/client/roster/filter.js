const filter = {
  matchIndex: function(str, f) {
    if (str == null || f == null) {
      return -1;
    } else {
      return str.toLowerCase().indexOf(f.toLowerCase());
    }
  },

  match: function(str, f) {
    let i = filter.matchIndex(str, f);
    if (i == -1) {
      return null;
    } else {
      return [
        str.substr(0, i),
        str.substr(i, f.length),
        str.substr(i + f.length),
      ];
    }
  }
}

export default filter;
