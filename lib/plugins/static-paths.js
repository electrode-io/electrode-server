"use strict";

//
// Hapi plugin to serve static files from dist/js and dist/images directories.
//

const StaticPaths = (server, options, next) => {

  const pathPrefix = options.pathPrefix || "";

  server.route([
    {
      method: "GET",
      path: "/js/{param*}",
      handler: {
        directory: {
          path: `${pathPrefix}dist/js`
        }
      }
    },
    {
      method: "GET",
      path: "/images/{param*}",
      handler: {
        directory: {
          path: `${pathPrefix}dist/images`
        }
      }
    },
    {
      method: "GET",
      path: "/html/{param*}",
      handler: {
        directory: {
          path: `${pathPrefix}dist/html`
        }
      }
    }
  ]);

  next();

};

StaticPaths.attributes = {
  name: "electrodeServerStaticPaths",
  version: "1.0.0"
};

module.exports = StaticPaths;
