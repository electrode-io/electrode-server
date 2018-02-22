/* eslint-disable no-console, prefer-spread */

"use strict";

const LEVELS = {
  info: 10,
  warn: 20,
  error: 30,
  none: 100
};

let level = LEVELS.info;

const logger = {
  setLevel(newLevel) {
    const lowerLevel = (newLevel || "info").toLowerCase();
    const numericLevel = LEVELS[lowerLevel];

    if (!numericLevel) {
      throw new Error(
        `Log level must be one of ${Object.keys(LEVELS).join(", ")}. Received "${newLevel}".`
      );
    }

    level = numericLevel;
  },

  info(/* messages */) {
    if (level <= LEVELS.info) {
      console.info.apply(console, arguments);
    }
  },

  warn(/* messages */) {
    if (level <= LEVELS.warn) {
      console.warn.apply(console, arguments);
    }
  },

  error(/* messages */) {
    if (level <= LEVELS.error) {
      console.error.apply(console, arguments);
    }
  }
};

module.exports = logger;
