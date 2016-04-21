"use strict";

//
// Hapi plugin to serve static files from dist/js and dist/images directories.
//

const StaticPaths = (server, options, next) => {

  const pathPrefix = options.pathPrefix || "";
  const config = {
    plugins: {
      "@walmart/csrf-jwt": { enabled: false }
    }
  };

  const connection = server.select("default");
  connection.route([
    {
      method: "GET",
      path: "/js/{param*}",
      handler: {
        directory: {
          path: `${pathPrefix}dist/js`
        }
      },
      config
    },
    {
      method: "GET",
      path: "/images/{param*}",
      handler: {
        directory: {
          path: `${pathPrefix}dist/images`
        }
      },
      config
    },
    {
      method: "GET",
      path: "/html/{param*}",
      handler: {
        directory: {
          path: `${pathPrefix}dist/html`
        }
      },
      config
    }
  ]);

  next();

};

StaticPaths.attributes = {
  pkg: {
    name: "electrodeServerStaticPaths",
    version: "1.0.0"
  }
};

module.exports = StaticPaths;
