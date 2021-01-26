const Path = require("path");
const Chalk = require("chalk");
const _ = require("lodash");
//
// Hapi plugin to serve static files from directories
// js, images, and html under ${options.pathPrefix}.
//

const after = options => server => {
  let pathPrefix = "";

  if (options.pathPrefix) {
    pathPrefix = options.pathPrefix;
    if (!options.quiet) {
      const msg = `staticPaths Plugin: static files path prefix "${pathPrefix}"`;
      console.log(Chalk.inverse.green(msg)); // eslint-disable-line
    }
  }

  const config = _.merge({}, options.config);

  server.route([
    {
      method: "GET",
      path: "/js/{param*}",
      handler: {
        directory: {
          path: Path.join(pathPrefix, "js")
        }
      },
      config
    },
    {
      method: "GET",
      path: "/images/{param*}",
      handler: {
        directory: {
          path: Path.join(pathPrefix, "images")
        }
      },
      config
    },
    {
      method: "GET",
      path: "/html/{param*}",
      handler: {
        directory: {
          path: Path.join(pathPrefix, "html")
        }
      },
      config
    }
  ]);
};

const StaticPaths = (server, options) => {
  server.dependency("inert", after(options));
};

module.exports = {
  register: StaticPaths,
  pkg: {
    name: "electrodeServerStaticPaths",
    version: "1.0.0"
  }
};
