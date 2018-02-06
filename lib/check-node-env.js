"use strict";

const _ = require("lodash");
const Chalk = require("chalk");

const logger = require("./logger.js");

function checkNodeEnv() {
  const allowed = ["development", "staging", "production", "test"];

  if (process.env.NODE_ENV && !_.includes(allowed, process.env.NODE_ENV)) {
    const msg = `Electrode Server Notice: NODE_ENV (${
      process.env.NODE_ENV
    }) should be empty or one of ${allowed}`; // eslint-disable-line
    logger.warn(`    ${Chalk.inverse.bold.yellow(msg)}`);
  }
}

module.exports = checkNodeEnv;
