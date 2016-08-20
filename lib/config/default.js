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

  plugins: {
    //
    // priority with lower value is higher
    //

    //
    // "app-config": {
    //   priority: -9999,
    //   enable: true,
    //   options: {}
    // }
    //
  },

  electrode: {
    source: "default",
    hostIP: "127.0.0.1",
    registerPluginsTimeout: 6000,
    "$applied$electrodeServerConfigDefaults": true
  }
};
