"use strict";

const path = require("path");

module.exports = {
  plugins: {
    inert: {
      enable: true
    },
    staticPaths: {
      enable: true,
      module: path.join(__dirname, "../plugins/static-paths"),
      options: {
        quiet: true,
        pathPrefix: "test/dist"
      }
    }
  }
};
