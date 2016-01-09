"use strict";

const Inert = require("inert");

module.exports = {
  services: {
    env: "",
    providers: {
      registry: {
        module: "@walmart/service-registry-client",
        autoInit: true
      }
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
    "@walmart/wl-soa-esb-bug-patch": {
      priority: 0,
      enable: true
    },
    appConfig: {
      priority: 10,
      enable: true,
      module: `${__dirname}/../plugins/app-config.js`
    },
    csrf: {
      priority: 15,
      enable: true,
      module: "crumb"
    },
    "@walmart/electrode-cls-provider": {
      priority: 20,
      enable: true
    },
    "@walmart/electrode-service-initializer": {
      priority: 20,
      enable: true
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
  },

  electrode: {
    hostIP: "127.0.0.1"
  }
};
