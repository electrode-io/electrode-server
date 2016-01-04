"use strict";

module.exports = function processEnvAbbreviation() {
  const environments = {
    "dev": "development",
    "sta": "staging",
    "pro": "production"
  };

  if (process.env.NODE_ENV) {
    const abbr = process.env.NODE_ENV.toLowerCase().substring(0, 3);
    const env = environments[abbr];
    if (env && env !== process.env.NODE_ENV) {
      console.log(`Electrode Server setting NODE_ENV from ${process.env.NODE_ENV} to ${env}`);
      process.env.NODE_ENV = env;
    }
  }
};
