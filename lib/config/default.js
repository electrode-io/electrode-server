"use strict";

const Inert = require("inert");

module.exports = {
  server: {
    app: {
      electrode: true,
      config: {}
    }
  },
  connections: {
    default: {
      host: process.env.HOST,
      address: process.env.HOST_IP || "0.0.0.0",
      port: parseInt(process.env.PORT, 10) || 3000,
      routes: {
        cors: true
      }
    }
  },
  plugins: {
    appConfig: {
      priority: 10,
      enable: true,
      module: `${__dirname}/../plugins/app-config.js`
    },
    csrf: {
      priority: 11,
      enable: true,
      module: "crumb"
    },
    inert: {
      priority: 100,
      enable: true,
      register: Inert
    },
    staticPaths: {
      priority: 120,
      enable: true,
      module: `${__dirname}/../plugins/static-paths.js`
    }
  }
};
