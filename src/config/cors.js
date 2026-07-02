const config = require('./env');

const corsOptions = {
  origin: config.cors.origin === '*' ? '*' : config.cors.origin.split(',').map((item) => item.trim()),
  methods: config.cors.methods.split(',').map((item) => item.trim()),
  allowedHeaders: config.cors.allowedHeaders.split(',').map((item) => item.trim())
};

module.exports = corsOptions;
