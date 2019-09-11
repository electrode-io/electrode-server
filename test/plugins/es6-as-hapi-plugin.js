"use strict";

function es6AsHapiPlugin(server, options, next) {
  server.expose({});
  return next();
}

es6AsHapiPlugin.attributes = {
  pkg: {
    name: "es6AsHapiPlugin",
    version: "1.0.0"
  }
};

module.exports.default = es6AsHapiPlugin;
