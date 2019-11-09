"use strict";

module.exports = {
  plugins: {
    inert: {
      module: "@hapi/inert",
      priority: 100,
      options: {}
    },

    staticPaths2: {
      priority: 120,
      module: {
        requireFromPath: __dirname,
        name: `../plugins/static-paths.js`
      },
      options: {
        pathPrefix: "",
        config: {}
      }
    }
  }
};
