const config = module.exports = {
  isProduction() { return process.env.NODE_ENV == 'production'; },
  isDevelopment() { return !config.isProduction(); }
};
