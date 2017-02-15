module.exports = {
  isAnyEsiError(error) {
    return error.name && error.name.startsWith('esi:');
  },
};
