/* eslint-disable strict, func-style, max-len */
"use strict";

const Path = require("path");
const Chalk = require("chalk");
const ErrorCommon = require("./error-common");
const Bluebird = require("bluebird");

function loadFailed(err, configFile) {

  const errors = {
    MODULE_NOT_FOUND: {
      reason: Chalk.bold.red(`Missing config file ${configFile}`),
      resolution: Chalk.yellow(`Please create the config file at the expected path. Refer to the github
    repository electrode/electrode-server for format and configuration options`)
    },

    unknown: {
      reason: Chalk.bold.red("Error in config file [config/electrode-server/server.js]"),
      resolution: Chalk.yellow(`Please check the output of the stack trace below and correct the error shown`)
    }
  };

  const msg = errors[err.code] || errors.unknown;

  const serverConfigError = new Error(msg.reason);
  serverConfigError.stack = err.stack;
  serverConfigError.type = "ECONFIG";
  serverConfigError.description = msg.resolution;

  const errDetail = `
      ${Chalk.bold.bgRed(serverConfigError.type)}

      ${ErrorCommon.errContext}

      ${serverConfigError.message}
      ${serverConfigError.description}

      ${ErrorCommon.fileIssue}`;

  /* eslint-disable no-console */
  console.error(errDetail);

  return Bluebird.reject(serverConfigError);
}

function loadElectrodeServerConfig(configFile) {

  // if caller pass config object in directly then just use it as is.

  if (typeof configFile === "object") {
    return Bluebird.resolve(configFile);
  }

  // Allow for consumers to write their config in ES6 and take care of the
  // transform themselves but without forcing them to write it in ES6 syntax
  const convertES6Module = (serverConfig) => serverConfig.default || serverConfig;

  const file = configFile || "./config/electrode-server/server.js";

  //
  // The config could either be a module in node_modules or a file in a path
  // relative to CWD
  // * module in node_modules: no leading "."
  // * file in a directory, relative path with leading "." under CWD, resolve
  //   full path for require
  //
  const requirePath = (x) => x.startsWith(".") ? Path.resolve(x) : x;

  //
  // load the config file with require, check if it's ES6 style module
  //
  return Bluebird.try(() => requirePath(file))
    .then(require)
    .then(convertES6Module)
    .catch((err) => loadFailed(err, file));
}

module.exports = loadElectrodeServerConfig;
