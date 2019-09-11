"use strict";

function asHapiPlugin(server, options, next) {
  server.expose({});
  return next();
}

asHapiPlugin.attributes = {
  pkg: {
    name: "asHapiPlugin",
    version: "1.0.0"
  }
};

module.exports = asHapiPlugin;
