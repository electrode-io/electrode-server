/* eslint-disable no-console, prefer-spread */

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
    } else {
      level = numericLevel;
    }
  },

  info(...args) {
    if (level <= LEVELS.info) {
      console.info.apply(console, args);
    }
  },

  warn(...args) {
    if (level <= LEVELS.warn) {
      console.warn.apply(console, args);
    }
    return;
  },

  error(...args) {
    if (level <= LEVELS.error) {
      console.error.apply(console, args);
    }
    return;
  }
};

export = logger;
