"use strict";

const Chalk = require("chalk");
const ErrorCommon = require("./error-common");
const logger = require("./logger.js");
const Promise = require("bluebird");

module.exports = function startFailed(err) {
  const errors = {
    EADDRINUSE: {
      reason: `The port the server is trying to listen on (${err.port}) is already in use.`,
      resolution: `
      Ensure no other processes are running on this port, or change the port
      your server should listen on.

      To identify which process is listening on port ${err.port} run this command:
    lsof -i :${err.port}
`
    },
    unknown: {
      reason: `There was an error starting the Hapi.js server.`,
      resolution: `
      This generally is not related to Hapi or electrode-server.
      The most likely cause is you have a Hapi plugin that's misbehaving.
      Please check the output of the stack trace below and correct the error shown
`
    }
  };

  const msg = errors[err.code] || errors.unknown;
  err.message = `${msg.reason}\n${err.message}`;
  err.moreInfo = msg;
  const stack = err.stack.split("\n");
  stack[0] = Chalk.red(stack[0]);

  const errDetail = `
    ${Chalk.bold.bgRed("ESERVERSTART")}
    ${ErrorCommon.errContext}
    ${Chalk.bold.red(msg.reason)}
    ${Chalk.inverse.bold.yellow(msg.resolution)}
    ${ErrorCommon.fileIssue}
    ${stack.join("\n")}
`;

  logger.error(errDetail);

  return Promise.reject(err);
};
