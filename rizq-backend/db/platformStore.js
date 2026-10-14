'use strict';
const engine = require('./engine');
module.exports = engine.isPostgres
  ? require('./platformStore.pg')
  : require('./platformStore.sqlite');
