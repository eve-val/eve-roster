module.exports = {
  isAnyEsiError(error) {
    return error.status != undefined;
  },
};
