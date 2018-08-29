"use strict";

function testPlugin(server) {
  server.expose({});
}

module.exports = {
  register: testPlugin,
  pkg: {
    name: "testPlugin",
    version: "1.0.0"
  }
};
