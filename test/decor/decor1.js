"use strict";

const path = require("path");

module.exports = {
  plugins: {
    inert: {},
    staticPaths: {
      enable: true,
      module: path.join(__dirname, "../plugins/static-paths"),
      options: {
        quiet: false,
        pathPrefix: ""
      }
    }
  },
  listener: () => {}
};
