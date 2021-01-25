
import _ from "lodash";
import Chalk from "chalk";
import logger from "./logger.js";

function checkNodeEnv() {
  const allowed = ["qa", "development", "staging", "production", "test"];

  if (process.env.NODE_ENV && !_.includes(allowed, process.env.NODE_ENV)) {
    const msg = `Electrode Server Notice: NODE_ENV (${
      process.env.NODE_ENV
    }) should be empty or one of ${allowed}`; // eslint-disable-line
    logger.warn(`    ${Chalk.inverse.bold.yellow(msg)}`);
  }
  return;
}

export = checkNodeEnv;
