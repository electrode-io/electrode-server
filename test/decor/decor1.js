"use strict";

module.exports = {
  plugins: {
    inert: {
      enable: true
    },
    staticPaths: {
      enable: true,
      options: {
        quiet: false,
        pathPrefix: ""
      }
    }
  },
  listener: () => {
  }
};
