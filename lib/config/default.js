"use strict";

const defaultListenPort = 3000;

module.exports = {
  logging: {
    transports: [
      {
        type: "stdout"
      }
    ]
  },
  services: {
    env: "",
    registryRefreshPath: "/electrode/services/discovery/refresh",
    providers: {
      "@walmart/service-registry-client": {
        autoInit: true
      }
    }
  },

  connections: {
    default: {
      host: process.env.HOST,
      address: process.env.HOST_IP || "0.0.0.0",
      port: parseInt(process.env.PORT, 10) || defaultListenPort,
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
    "@walmart/electrode-logging-plugin": {
      priority: 20,
      enable: true
    },
    "@walmart/electrode-log-consumer": {
      priority: 20,
      enable: true
    },
    "@walmart/electrode-service-initializer": {
      priority: 20,
      enable: true
    },
    "inert": {
      priority: 100,
      enable: true
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
