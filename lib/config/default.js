"use strict";

const defaultListenPort = 3000;

module.exports = {
  logging: {
    logMode: "development",
    serializers: {
      verbose: false
    },
    transports: [
      {
        type: "stdout",
        default: true
      }
    ]
  },

  ccm: {
    ccmRefreshPath: "/electrode/services/ccm/refresh",
    interval: 60
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
      },
      state: {
        ignoreErrors: true
      }
    }
  },

  plugins: {
    "@walmart/wl-soa-esb-bug-patch": {
      priority: -9999,
      enable: true
    },
    appConfig: {
      priority: -9999,
      enable: true,
      module: `${__dirname}/../plugins/app-config.js`
    },
    "@walmart/electrode-cls-provider": {
      priority: -9900,
      enable: true
    },
    "@walmart/electrode-logging-plugin": {
      priority: -9800,
      enable: true
    },
    "@walmart/electrode-log-consumer": {
      priority: -9700,
      enable: true
    },
    "@walmart/electrode-service-initializer": {
      priority: -9600,
      enable: true
    },
    "@walmart/electrode-ccm-initializer": {
      priority: -9500,
      enable: true
    },
    "@walmart/electrode-fetch/lib/hapi-plugin": {
      priority: -9400,
      enable: true
    },
    "@walmart/electrode-cookies/hapi-plugin": {
      priority: 100,
      enable: true
    },
    "@walmart/electrode-health": {
      enable: true
    },
    "@walmart/electrode-ui-config/hapi-plugin": {
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
    hostIP: "127.0.0.1",
    registerPluginsTimeout: 3000,
    "$applied$electrodeServerConfigDefaults": true
  }
};
