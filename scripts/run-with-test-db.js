#!/usr/bin/env node
/** تفويض إلى عازل rizq_test في rizq-backend — لكل scripts/test-*.js من الجذر */
'use strict';
const path = require('path');
const { spawn } = require('child_process');
const wrapper = path.join(__dirname, '..', 'rizq-backend', 'scripts', 'run-with-test-db.js');
const args = process.argv.slice(2);
const child = spawn(process.execPath, [wrapper].concat(args), {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});
child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code == null ? 1 : code);
});
