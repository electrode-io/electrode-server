"use strict";

const path = require("path");

module.exports = {
  plugins: {
    inert: {
      priority: 100,
      options: {}
    },

    staticPaths2: {
      priority: 120,
      module: path.join(__dirname, `../plugins/static-paths.js`),
      options: {
        pathPrefix: "",
        config: {}
      }
    }
  }
};
