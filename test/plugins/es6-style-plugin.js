"use strict";

function es6StylePlugin(server, options, next) {
  server.expose({});
  return next();
}

es6StylePlugin.attributes = {
  pkg: {
    name: "es6StylePlugin",
    verrsion: "1.0.0"
  }
};

module.exports.default = es6StylePlugin;

