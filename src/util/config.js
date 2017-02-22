module.exports = {
  isProduction() {
    return process.env.NODE_ENV == 'production';
  },
};
