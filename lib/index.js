"use strict";

/**
 * HAPI web server.
 */

const Hapi = require("hapi");
const Hoek = require("hoek");
const _ = require("lodash");
const Bluebird = require("bluebird");
const Chalk = require("chalk");
const Path = require("path");

const serverConfigLoader = require("./config-loader");
const startFailed = require("./start-failed");
const serverConfigDefaults = require("./config/default");

function convertPluginsToArray(plugins) {

  //
  // The module could either be one in node_modules or a file in a path
  // relative to CWD
  // * module in node_modules: no leading "."
  // * file in a directory, relative path with leading "." under CWD, resolve
  //   full path for require
  //
  const fullRequirePath = (x) => x.startsWith(".") ? Path.resolve(x) : x;

  const loadModule = (p) => {
    // if plugin didn't specify register but a module name, then load the module
    const shouldLoad = !p.register && _.isString(p.module);

    const doRequire = () => shouldLoad && Bluebird.resolve(fullRequirePath(p.module))
      .then(require) // use require to load the module
      .catch((error) => {
        error.message = `Failed loading module ${p.module}: ${error.message}`;
        throw error;
      })
      .then((mod) => p.register = mod.default ? mod.default : mod);

    return Bluebird.try(doRequire).then(() => p);
  };

  const num = (x) => _.isString(x) ? parseInt(x, 10) : x;
  const checkNaN = (x) => isNaN(x) ? Infinity : x;

  const priority = (p) => checkNaN(num(p.priority));
  const isEnable = (p) => p.enable !== false;

  //
  // filter out disabled ones, and sort by priority
  //
  const pluginsArray = () => _(plugins).filter(isEnable).sortBy(priority).value();

  // For each plugin check if it has a module to load.
  return Bluebird.try(pluginsArray).map(loadModule);
}

function startElectrodeServer(serverConfig, server) {

  const setConnections = () => {
    _.each(serverConfig.connections, (conn, name) => {
      if (!conn.labels) {
        conn.labels = name;
      } else if (_.isArray(conn.labels) && !_.contains(conn.labels, name)) {
        conn.labels.push(name);
      }
      server.connection(conn);
    });
  };

  const registerPlugins = (plugins) => new Bluebird((resolve, reject) => {
    server.register(plugins, (err) => {
      if (err) {
        /*eslint-disable no-console*/
        console.error("Register plugins failed", err);
        /*eslint-enable no-console*/
        reject(err);
      } else {
        resolve();
      }
    });
  });

  const startServer = () => new Bluebird((resolve, reject) => {
    server.start((err) => err ? reject(err) : resolve());
  });

  const logStarted = () => {
    _.each(server.connections, (conn) => {
      /* eslint-disable no-console */
      console.log(Chalk.green(`\nHapi.js server running at ${conn.info.uri}\n`));
      /* eslint-enable no-console */
    });
  };

  return Bluebird.try(setConnections)
    .then(() => convertPluginsToArray(serverConfig.plugins))
    .then(registerPlugins)
    .then(startServer)
    .then(logStarted)
    .then(() => server)
    .catch(startFailed);
}

module.exports = function electrodeServer(config, callback) {

  const start = (serverConfig) =>
    Bluebird.try(() => new Hapi.Server(serverConfig.server))
      .then((server) => startElectrodeServer(serverConfig, server));

  const loadConfig = () =>
    serverConfigLoader(config)
      .then((serverConfig) => Hoek.applyToDefaults(serverConfigDefaults, serverConfig));

  const promise = loadConfig().then(start);

  return callback ? promise.nodeify(callback) : promise;

};
