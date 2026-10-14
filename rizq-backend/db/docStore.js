'use strict';
const engine = require('./engine');
module.exports = engine.isPostgres
  ? require('./docStore.pg')
  : require('./docStore.sqlite');
