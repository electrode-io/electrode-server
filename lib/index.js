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

  const num = (x) => _.isString(x) ? parseInt(x, 10) : x;
  const priority = (x) => isNaN(x) ? Infinity : x;

  //
  // The module could either be one in node_modules or a file in a path
  // relative to CWD
  // * module in node_modules: no leading "."
  // * file in a directory, relative path with leading "." under CWD, resolve
  //   full path for require
  //
  const requirePath = (x) => x.startsWith(".") ? Path.resolve(x) : x;

  const composePlugin = (p, k) => {
    // put plugin's field name in __name
    p.__name = k;

    // if it didn't specify register but a module name, then load the module
    if (!p.register && p.module) {
      /* eslint-disable global-require */
      p.register = require(requirePath(p.module));
      /* eslint-enable global-require */
    }

    return p;
  };

  //
  // For each entry, compose it, filter out by enable false, and sort by priority
  //
  return Bluebird.try(() => _(plugins)
    .map(composePlugin)
    .filter((p) => p.enable !== false)
    .sortBy((p) => priority(num(p.priority)))
    .value());
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
