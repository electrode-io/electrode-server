/* eslint-disable no-console */

"use strict";

const LEVELS = {
  info: 10,
  warn: 20,
  error: 30
};

let level = LEVELS.info;

const logger = {

  setLevel(newLevel) {
    const lowerLevel = (newLevel || "info").toLowerCase();
    const numericLevel = LEVELS[lowerLevel];

    if (!numericLevel) {
      throw new Error(
        `Log level must be one of ${Object.keys(LEVELS).join(", ")}. Received "${newLevel}".`);
    }

    level = numericLevel;
  },

  info(...message) {
    if (level <= LEVELS.info) {
      console.info(...message);
    }
  },

  warn(...message) {
    if (level <= LEVELS.warn) {
      console.warn(...message);
    }
  },

  error(...message) {
    if (level <= LEVELS.error) {
      console.error(...message);
    }
  }
};

module.exports = logger;
