/* eslint-disable strict, func-style */
"use strict";

function pluginNoPriority(server, options, next) {
  return next(!server.app.plugin2 && "pluginNoPriority is called before plugin2");
}

pluginNoPriority.attributes = {
  pkg: {
    name: "pluginNoPriority"
  }
};

function nulPlugin1(server, options, next) {
  server.app.plugin1 = true;
  return next();
}

nulPlugin1.attributes = {
  pkg: {
    name: "nulPlugin1"
  }
};


function nulPlugin2(server, options, next) {
  server.app.plugin2 = true;
  return next(!server.app.plugin1 && "plugin2 is called before plugin1");
}

nulPlugin2.attributes = {
  pkg: {
    name: "nulPlugin2"
  }
};


module.exports = {
  pageTitle: "test 1",
  connections: {
    test1: {
      labels: "test1-label",
      port: 4000
    },
    test2: {
      labels: ["test2-label"],
      port: 5000
    }
  },

  plugins: {
    testNoPriority: {
      register: pluginNoPriority
    },
    plugin1: {
      priority: 499,
      register: nulPlugin1
    },
    testStringPriority: {
      priority: "500",
      register: nulPlugin2
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
