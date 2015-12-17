/* eslint-disable strict, func-style, max-len */
"use strict";

const Chalk = require("chalk");

const errCommon = {
  fileIssue: Chalk.green`
    If you have followed this resolution step and you are still seeing an
    error, please file an issue on the electrode-server repository

    https://gecgithub01.walmart.com/electrode/electrode-server/issues
  `,
  errContext: `
    ${Chalk.underline.blue("This error is thrown by the")} ${Chalk.bgBlue("@walmart/electrode-server")} ${Chalk.underline.blue("module")}
  `
};

module.exports = errCommon;
