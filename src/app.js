const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const { corsOptions, env } = require('./config');
const { httpLogger } = require('./logger/httpLogger');
const { apiRateLimiter } = require('./middleware/rateLimiter');
const requestContextLogger = require('./middleware/requestContextLogger');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', env.app.trustProxy);

app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(apiRateLimiter);
app.use(requestContextLogger);
app.use(httpLogger);

app.use(env.app.basePath, routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
