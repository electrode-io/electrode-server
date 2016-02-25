"use strict";

//
// simple plugin to provide server.app.config in request.app.config
//

function appConfigPlugin(server, options, next) {
  server.ext("onRequest", (request, reply) => {

    //
    // Ensure that the cookie is in a Hapi hapi format
    // While Hapi can ignore "a=b;;c=0", it can't even parse "a=1;; b=123"
    //
    // RFC http://www.ietf.org/rfc/rfc2109.txt Section 4.1 Syntax
    //   av-pairs        =       av-pair *(";" av-pair)
    //
    if (request.headers.cookie) {
      request.headers.cookie = request.headers.cookie.split(";")
        .map((x) => x.trim()).filter((x) => x).join(";");
    }

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
