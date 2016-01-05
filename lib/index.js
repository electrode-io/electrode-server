"use strict";

/**
 * HAPI web server.
 */
const Hapi = require("hapi");
const _ = require("lodash");
const Promise = require("bluebird");
const Chalk = require("chalk");
const Path = require("path");

const serverConfigLoader = require("./config-loader");
const startFailed = require("./start-failed");
const serverConfigDefaults = require("./config/default");
const enforceNodeEnv = require("./enforce-node-env.js");

const Config = require("config");

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
    // if p.register is not defined then use p.module if it's a string
    // else use field name for the plugin if module is not explicitly false
    const getModuleName = () => !p.register &&
      (_.isString(p.module) ? p.module : p.module !== false && p.__name)
      ; // --

    const name = getModuleName();
    //
    // if has a name for the module to load, then try to load it.
    //
    const doRequire = () => name && Promise.resolve(fullRequirePath(name))
      .then(require) // use require to load the module
      .catch((error) => {
        error.message = `Failed loading module ${name}: ${error.message}`;
        throw error;
      })
      // check ES6 style module
      .then((mod) => p.register = mod.default ? mod.default : mod);

    return Promise.try(doRequire).then(() => p);
  };

  const num = (x) => _.isString(x) ? parseInt(x, 10) : x;
  const checkNaN = (x) => isNaN(x) ? Infinity : x;

  const priority = (p) => checkNaN(num(p.priority));
  const isEnable = (p) => p.enable !== false;
  const transpose = (p, k) => (p.__name = k, p);

  //
  // transpose each plugin, filter out disabled ones, and sort by priority
  //
  const pluginsArray = () => _(plugins).map(transpose).filter(isEnable).sortBy(priority).value();

  // convert plugins object to array and check each one if it has a module to load.
  return Promise.try(pluginsArray).map(loadModule);
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

  const registerPlugins = (plugins) => new Promise((resolve, reject) => {
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

  const startServer = () => new Promise((resolve, reject) => {
    server.start((err) => err ? reject(err) : resolve());
  });

  const logStarted = () => {
    _.each(server.connections, (conn) => {
      /* eslint-disable no-console */
      console.log(Chalk.green(`\nHapi.js server running at ${conn.info.uri}\n`));
      /* eslint-enable no-console */
    });
  };

  return Promise.try(setConnections)
    .then(() => convertPluginsToArray(serverConfig.plugins))
    .then(registerPlugins)
    .then(startServer)
    .then(logStarted)
    .then(() => server)
    .catch(startFailed);
}

module.exports = function electrodeServer(appConfig, callback) {
  enforceNodeEnv();

  const makeHapiServerConfig = (serverConfig) => {
    const hapiServerConfig = {
      app: {
        electrode: true
      }
    };

    if (serverConfig.server) {
      Config.util.extendDeep(hapiServerConfig, serverConfig.server);
    }

    hapiServerConfig.app.config = serverConfig;

    return hapiServerConfig;
  };

  const start = (serverConfig) =>
    Promise.try(() => new Hapi.Server(makeHapiServerConfig(serverConfig)))
      .then((server) => startElectrodeServer(serverConfig, server));

  const applyDefaultConfigs = (serverConfig) => {
    Config.util.extendDeep(serverConfigDefaults, serverConfig);
    return serverConfigDefaults;
  };

  const loadConfig = () => serverConfigLoader(appConfig).then(applyDefaultConfigs);

  const promise = loadConfig().then(start);

  return callback ? promise.nodeify(callback) : promise;

};
