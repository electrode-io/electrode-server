/* eslint-disable max-len */
"use strict";

const Chalk = require("chalk");
const Pkg = require("../package.json");

const caughtMsg = `The ${Pkg.name} module ${Chalk.cyan(
  "caught"
)} an error while starting your server`;

const errCommon = {
  fileIssue: Chalk.green(`
    If you have followed this resolution step and you are still seeing an
    error, please file an issue on the electrode-server repository

    ${Pkg.repository.url}
  `),
  errContext: `
    ${caughtMsg}
  `
};

module.exports = errCommon;
