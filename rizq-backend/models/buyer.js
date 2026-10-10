'use strict';
const engine = require('../db/engine');
module.exports = engine.isPostgres
  ? require('./buyer.pg')
  : require('./buyer.sqlite');
