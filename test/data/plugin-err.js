"use strict";

function nulPlugin(server, options, next) {
  next("plugin_failure");
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
