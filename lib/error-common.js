/* eslint-disable max-len */
"use strict";

const Chalk = require("chalk");
const Pkg = require("../package.json");

const errCommon = {
  fileIssue: Chalk.green(`
    If you have followed this resolution step and you are still seeing an
    error, please file an issue on the electrode-server repository

    ${Pkg.repository.url}
  `),
  errContext: `
    ${Chalk.underline.blue("This error is thrown by the")} ${Chalk.bgBlue(
    Pkg.name
  )} ${Chalk.underline.blue("module")}
  `
};

module.exports = errCommon;
