/* eslint-disable max-len, no-magic-numbers */

import Chalk from "chalk";
const ErrorCommon = require("./error-common");
const logger = require("./logger.js");

import _ from "lodash";

const { PLUGIN_KEY } = require("./symbols");

const cleanStack = stacks => {
  const cwd = process.cwd();
  return stacks.map(x => x.replace(cwd, "."));
};

export = function startFailed(err) {
  const errors = {
    EADDRINUSE: () => {
      return {
        reason: `the network port (${err.port}) is already in use but your server is trying to listen to it`,
        resolution: `
      Ensure no other processes are running on this port, or change the port
      your server should listen on.

      To identify which process is listening on port ${err.port} run this command:
    lsof -i :${err.port}
`
      };
    },
    unknown: () => {
      return {
        reason: `There was an error starting the Hapi.js server.`,
        resolution: `
      This generally is not related to Hapi or electrode-server.
      The most likely cause is you have a Hapi plugin that's misbehaving.
      Please check the output of the stack trace below and correct the error shown
`
      };
    },
    XEVENT_TIMEOUT: () => {
      const eventMsg = Chalk.green(err.event);
      const nextMsg = Chalk.magenta("next");
      const configMsg = Chalk.green("config.electrode.eventTimeout");
      const timeoutMsg = Chalk.green(err.timeout);
      const listenerMsg = Chalk.green("config.listener");

      return {
        reason: `Your handler for event ${eventMsg} did not call ${nextMsg} within ${timeoutMsg} msec.`,
        resolution: `
      Event timeout is configured with '${configMsg}' (in milliseconds),
      and it is not enabled unless you set it to a non-zero value.
      If you need more time, then please set a longer timeout value.

      Please double check your event handler registered by your '${listenerMsg}'
      and make sure it completes and calls ${nextMsg}.
`
      };
    },
    XEVENT_FAILED: () => {
      const eventMsg = Chalk.green(err.event);
      const listenerMsg = Chalk.green("config.listener");

      return {
        reason: `electrode-server received error from your handler for event ${eventMsg}`,
        resolution: `
      Please double check and verify your event handler for ${eventMsg} registered by your '${listenerMsg}'.
`
      };
    },
    XPLUGIN_FAILED: () => {
      const name = _.get(err, ["plugin", PLUGIN_KEY], "unknown");
      return {
        reason: `failed registering your plugin '${name}' ${err.method}`,
        resolution: `
      Please double check and verify your plugin '${name}'.
`
      };
    }
  };

  const msg = (errors[err.code] || errors.unknown)();

  const stack = cleanStack(err.stack.split("\n"));
  stack[0] = Chalk.red(stack[0]);
  let preserve = "";
  if (err.preserve) {
    const preserveStack = cleanStack(err.preserve.stack.split("\n"));
    preserveStack[0] = Chalk.red(preserveStack[0]);
    preserve = `${preserveStack.join("\n")}`;
  }

  const errDetail = `
    ${Chalk.bold.bgRed(ErrorCommon.errContext)}

    ${Chalk.bold.red(msg.reason)}
    ${Chalk.bold.red("message:")} ${err.message}

    ${Chalk.bold.green("Suggestion to resolve the issue:")}
    ${Chalk.inverse.bold.yellow(msg.resolution)}
    ${ErrorCommon.fileIssue}
    ${stack.join("\n")}

    ${preserve}
`;

  err.message = `${msg.reason}\n${err.message}`;
  err.moreInfo = msg;

  logger.error(errDetail);

  return Promise.reject(err);
};
