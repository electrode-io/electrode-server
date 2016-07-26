"use strict";

const defaultListenPort = 3000;

module.exports = {
  server: {
    // options to pass to Hapi.server
  },
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

  //
  // priority with lower value is higher
  //
  plugins: {
    appConfig: {
      priority: -9999,
      enable: true,
      module: `${__dirname}/../plugins/app-config.js`,
      options: {}
    },
    "inert": {
      priority: 100,
      enable: false,
      options: {}
    },
    staticPaths: {
      priority: 120,
      enable: false,
      module: `${__dirname}/../plugins/static-paths.js`,
      options: {
        pathPrefix: "",
        config: {}
      }
    }
  },

  electrode: {
    source: "default",
    hostIP: "127.0.0.1",
    registerPluginsTimeout: 6000,
    "$applied$electrodeServerConfigDefaults": true
  }
};
