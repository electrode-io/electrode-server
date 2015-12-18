"use strict";

function testPlugin(server, options, next) {
  server.expose({});
  return next();
}

testPlugin.attributes = {
  pkg: {
    name: "testPlugin",
    verrsion: "1.0.0"
  }
};

module.exports = testPlugin;

