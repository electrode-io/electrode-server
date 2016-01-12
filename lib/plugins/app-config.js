"use strict";

//
// simple plugin to provide server.app.config in request.app.config
//

function appConfigPlugin(server, options, next) {
  server.ext("onRequest", (request, reply) => {
    request.app.config = server.app.config;
    return reply.continue();
  });
  next();
}

appConfigPlugin.attributes = {
  pkg: {
    name: "appConfig",
    version: "1.0.0"
  }
};

module.exports = appConfigPlugin;
