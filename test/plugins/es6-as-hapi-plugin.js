"use strict";

function es6AsHapiPlugin(server) {
  server.expose({});
}

module.exports.default = {
  hapiPlugin: {
    register: es6AsHapiPlugin,
    pkg: {
      name: "es6AsHapiPlugin",
      version: "1.0.0"
    }
  }
};
