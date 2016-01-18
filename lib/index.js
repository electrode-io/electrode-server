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
const superAgent = require("superagent");

const Config = require("config");
const DNS = require("dns");
const OS = require("os");

function convertPluginsToArray(plugins) {

  //
  // The module could either be one in node_modules or a file in a path
  // relative to CWD
  // * module in node_modules: no leading "."
  // * file in a directory, relative path with leading "." under CWD, resolve
  //   full path for require
  //
  const fullRequirePath = (x) => {
    return x.startsWith(".") ? Path.resolve(x) : x;
  };

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

  const num = (x) => {
    return _.isString(x) ? parseInt(x, 10) : x;
  };

  const checkNaN = (x) => {
    return isNaN(x) ? Infinity : x;
  };

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

function startElectrodeServer(server) {

  const config = server.app.config;

  const setConnections = () => {
    _.each(config.connections, (conn, name) => {
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
    server.start((err) => {
      return err ? reject(err) : resolve();
    });
  });

  const logStarted = () => {
    _.each(server.connections, (conn) => {
      /* eslint-disable no-console */
      console.log(Chalk.green(`\nHapi.js server running at ${conn.info.uri}\n`));
      /* eslint-enable no-console */
    });
  };

  const invokeInitializerRefresh = () => {
    const refreshPath = config.services.registryRefreshPath;
    return new Promise((resolve, reject) => {
      return refreshPath &&

        superAgent.get(`http://localhost:3000${refreshPath}`)
          .end((err, res) => {
            return err ? reject(res.error) : resolve(res);
          }) ||

        resolve();
    })
      .catch((err) => {
        /* eslint-disable no-console */
        console.log("Electrode Server - service discovery refresh returned error:", err);
        /* eslint-enable no-console */
      });
  };

  return Promise.try(setConnections)
    .then(() => convertPluginsToArray(config.plugins))
    .then(registerPlugins)
    .then(startServer)
    .then(invokeInitializerRefresh)
    .then(logStarted)
    .then(() => server)
    .catch(startFailed);
}

module.exports = function electrodeServer(appConfig, callback) {
  enforceNodeEnv();

  const makeHapiServerConfig = (serverConfig) => {
    const hapiServerConfig = {
      app: {
        electrodeServer: true
      }
    };

    if (serverConfig.server) {
      Config.util.extendDeep(hapiServerConfig, serverConfig.server);
    }

    //
    // This will allow Hapi to make config available through
    // server.settings.app.config
    //
    hapiServerConfig.app.config = serverConfig;

    return hapiServerConfig;
  };

  const lookupHostIP = (serverConfig) => {
    const hostname = serverConfig.electrode.hostname || OS.hostname();

    const ip4 = 4;
    return new Promise((resolve, reject) =>
      DNS.lookup(hostname, ip4, (err, address) => {
        return err ? reject(err) : resolve(address);
      })
    )
      .then((address) => {
        serverConfig.electrode.hostname = hostname;
        serverConfig.electrode.hostIP = address;
      })
      .catch(() => 0); // if can't resolve host IP from hostname, then just forget it.
  };

  const start = (serverConfig) =>
    Promise.try(() => lookupHostIP(serverConfig))
      .then(() => new Hapi.Server(makeHapiServerConfig(serverConfig)))
      .then((server) => {
        //
        // Make config available in server.app.config, in addition to
        // server.settings.app.config
        //
        server.app.config = server.settings.app.config;

        // Start server

        return startElectrodeServer(server);
      });

  const applyDefaultConfigs = (serverConfig) => {
    const defaults = Config.util.cloneDeep(serverConfigDefaults);
    Config.util.extendDeep(defaults, serverConfig);
    return defaults;
  };

  const loadConfig = () => serverConfigLoader(appConfig).then(applyDefaultConfigs);

  const promise = Promise.try(loadConfig).then(start);

  return callback ? promise.nodeify(callback) : promise;

};
