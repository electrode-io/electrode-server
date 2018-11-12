"use strict";

const Chalk = require("chalk");
const Pkg = require("../package.json");

const caught = Chalk.cyan("caught");

const errCommon = {
  fileIssue: Chalk.green(`
    If you have followed this resolution step and you are still seeing an
    error, please file an issue on the electrode-server repository

    ${Pkg.repository.url}
  `),
  errContext: `${Pkg.name} ${caught} an error while starting your server`
};

module.exports = errCommon;
