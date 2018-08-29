"use strict";

function pluginNoPriority(server) {
  return !server.app.plugin2 && "pluginNoPriority is called before plugin2";
}

function nulPlugin1(server) {
  server.app.plugin1 = true;
}

function nulPlugin2(server) {
  server.app.plugin2 = true;
  return !server.app.plugin1 && "plugin2 is called before plugin1";
}

module.exports = {
  pageTitle: "test 1",
  plugins: {
    testNoPriority: {
      register: pluginNoPriority,
      pkg: {
        name: "pluginNoPriority"
      }
    },
    plugin1: {
      priority: 499,
      register: nulPlugin1,
      pkg: {
        name: "nulPlugin1"
      }
    },
    plugin1Disable: {
      priority: 499,
      register: nulPlugin1,
      pkg: {
        name: "nulPlugin1"
      },
      enable: false
    },
    testStringPriority: {
      priority: "500",
      register: nulPlugin2,
      pkg: {
        name: "nulPlugin2"
      }
    },
    testPlugin: {
      module: "./test/plugins/test-plugin"
    },
    es6StylePlugin: {
      module: "./test/plugins/es6-style-plugin"
    }
  },
  server: {
    app: {
      config: {
        test1: true
      }
    }
  }
};
