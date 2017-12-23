"use strict";

const Chalk = require("chalk");
const ErrorCommon = require("./error-common");
const logger = require("./logger.js");
const Promise = require("bluebird");

module.exports = function startFailed(err) {

  const errors = {
    EADDRINUSE: {
      reason: `
    The port the server is trying to listen on (${err.port}) is already in use.
    Ensure no other processes are running on this port, or change the port
    electrode-server should listen on.

    To identify which process is listening on port ${err.port} run this command:
    lsof -i :${err.port}
    `,
      resolution: ""
    },

    unknown: {
      reason: "There was an error starting the Hapi.js server",
      resolution: `Please check the output of the stack trace below and correct the error shown`
    }
  };

  const msg = errors[err.code] || errors.unknown;

  const serverStartError = new Error(Chalk.bold.red(msg.reason));
  serverStartError.stack = err.stack;
  serverStartError.type = "ESERVERSTART";
  serverStartError.description = Chalk.inverse.bold.yellow(msg.resolution);
  serverStartError._err = err;

  const errDetail = `
    ${Chalk.bold.bgRed(serverStartError.type)}
    ${ErrorCommon.errContext}
    ${serverStartError.message}
    ${serverStartError.description}
    ${ErrorCommon.fileIssue}
    ${Chalk.bold.red(err.message)}
`;

  logger.error(errDetail);

  return Promise.reject(serverStartError);
};
