"use strict";

//
// simple plugin to provide server.app.config in request.app.config
//

function appConfigPlugin(server) {
  server.ext("onRequest", (request, h) => {
    request.app.config = server.app.config;
    return h.continue;
  });
}

module.exports = {
  register: appConfigPlugin,
  pkg: {
    name: "appConfig",
    version: "1.0.0"
  }
};
