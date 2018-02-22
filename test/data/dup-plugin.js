"use strict";

function nulPlugin(server, options, next) {
  next();
}

nulPlugin.attributes = {
  pkg: {
    name: "nulPlugin"
  }
};

module.exports = {
  pageTitle: "test 1",
  plugins: {
    plugin1: {
      register: nulPlugin
    },
    plugin2: {
      register: nulPlugin
    }
  },
  server: {
    app: {
      config: {
        test2: true
      }
    }
  },
  electrode: {
    logLevel: "none"
  }
};
