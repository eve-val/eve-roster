const isProd = function() {
  return process.env.NODE_ENV == 'production';
}

module.exports = {
  isProduction: isProd,
  isDevelopment() { return !isProd(); }
};
