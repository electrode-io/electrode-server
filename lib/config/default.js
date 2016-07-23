"use strict";

const defaultListenPort = 3000;

module.exports = {
  connections: {
    default: {
      host: process.env.HOST,
      address: process.env.HOST_IP || "0.0.0.0",
      port: parseInt(process.env.PORT, 10) || defaultListenPort,
      routes: {
        cors: true
      },
      state: {
        ignoreErrors: true
      }
    }
  },

  plugins: {
    appConfig: {
      priority: -9999,
      enable: true,
      module: `${__dirname}/../plugins/app-config.js`
    },
    "inert": {
      priority: 100,
      enable: false
    },
    staticPaths: {
      priority: 120,
      enable: false,
      module: `${__dirname}/../plugins/static-paths.js`
    }
  },

  electrode: {
    hostIP: "127.0.0.1",
    registerPluginsTimeout: 3000,
    "$applied$electrodeServerConfigDefaults": true
  }
};
