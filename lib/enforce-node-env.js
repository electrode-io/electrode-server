"use strict";

const _ = require("lodash");

module.exports = function enforceNodeEnv() {
  const allowed = ["development", "staging", "production", "test"];

  if (process.env.NODE_ENV && !_.includes(allowed, process.env.NODE_ENV)) {
    throw new Error(
      `Electrode Server - NODE_ENV (${process.env.NODE_ENV}) must be empty or one of ${allowed}`
    );
  }
};
