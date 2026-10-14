'use strict';
const engine = require('../db/engine');
module.exports = engine.isPostgres
  ? require('./wishlist.pg')
  : require('./wishlist.sqlite');
