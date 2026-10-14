'use strict';
const engine = require('../db/engine');
module.exports = engine.isPostgres
  ? require('./corpApiIntegration.pg')
  : require('./corpApiIntegration.sqlite');
