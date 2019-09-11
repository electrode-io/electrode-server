"use strict";

function asHapiPlugin(server) {
  server.expose({});
}

module.exports = {
  hapiPlugin: {
    register: asHapiPlugin,
    pkg: {
      name: "asHapiPlugin",
      version: "1.0.0"
    }
  }
};
