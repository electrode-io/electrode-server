"use strict";

//
// Get CLS patching done ASAP.
//
require("@walmart/electrode-cls-provider");
const Promise = require("bluebird");
const Hapi = require("hapi");
const _ = require("lodash");
const Chalk = require("chalk");
const Path = require("path");
const EventEmitter = require("events");

const startFailed = require("./start-failed");
const enforceNodeEnv = require("./enforce-node-env.js");

const DNS = require("dns");
const OS = require("os");

const Confippet = require("@walmart/electrode-confippet");
const dnscache = require("./dnscache");

const DEFAULT_REFRESH_INTERVAL = 300; // default CCM/service refresh interval in seconds
const HTTP_OK = 200;
const emitter = new EventEmitter();

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
      } else if (_.isArray(conn.labels) && !_.includes(conn.labels, name)) {
        conn.labels.push(name);
      }
      server.connection(conn);
    });
  };

  emitter.emit("server-created");
  // making the registerPluginsTimeout configurable by apps
  const registerPluginsTimeout = config.electrode.registerPluginsTimeout;

  const registerPlugins = (plugins) => (new Promise((resolve, reject) => {

    server.register(plugins, (err) => {
      if (err) {
        console.error("Register plugins failed", err); // eslint-disable-line
        reject(err instanceof Error ? err : new Error(err));
      } else {
        resolve();
      }
    });
  }))
    .timeout(registerPluginsTimeout)
    .catch(Promise.TimeoutError, () => {
      return new Promise((resolve, reject) => {
        server.stop(() => {
          reject(new Error("Electrode Server register plugins timeout.  Did you forget next()?"));
        });
      });
    });

  const startServer = () => new Promise((resolve, reject) => {
    server.start((err) => {
      return err ? reject(err) : resolve();
    });
  });

  const logStarted = () => {
    _.each(server.connections, (conn) => {
      console.log(Chalk.green(`\nHapi.js server running at ${conn.info.uri}\n`)); // eslint-disable-line
    });
  };

  const invokeRefresher = (refreshPath, tag) => {
    return new Promise((resolve, reject) => {
      const defaultServer = server.select("default");
      const conn = _.first(defaultServer.connections);
      //
      // not using server.info.uri because that could be using a different hostname
      // but we really just want to access through localhost
      //
      const url = `${conn.info.protocol}://localhost:${conn.info.port}${refreshPath}`;
      conn.inject(
        {
          method: "GET",
          url
        },
        (res) => {
          return res.statusCode === HTTP_OK ?
            resolve() : reject(new Error(`${url} returned status ${res.statusCode}`));
        }
      );
    })
      .catch((err) => {
        console.log(`Electrode Server - ${tag} refresh returned error:`, err); // eslint-disable-line
      });
  };

  const repeatRefresh = (refreshPath, tag, interval) => {
    const invoke = () => invokeRefresher(refreshPath, tag);

    interval = interval > 0 ? interval : DEFAULT_REFRESH_INTERVAL;
    const repeater = setInterval(invoke, interval * 1000); // eslint-disable-line

    server.app.refreshers[tag] = {interval, repeater};

    return invoke();
  };

  const invokeInitializerRefresh = () => {
    const refreshPath = config.services.registryRefreshPath;

    if (config.services.autoDiscovery !== false && refreshPath) {
      return invokeRefresher(refreshPath, "service");
    }
  };

  const invokeCcmRefresh = () => {
    const refreshPath = config.ccm.ccmRefreshPath;
    if (config.ccm.autoLoad && refreshPath) {
      return repeatRefresh(refreshPath, "ccm", config.ccm.interval);
    }
  };

  server.app.refreshers = {};

  server.ext("onPreStop", (s, next) => {
    _.each(s.app.refreshers, (ref) => {
      clearInterval(ref.repeater);
    });
    next();
  });

  return Promise.try(setConnections)
    .then(() => convertPluginsToArray(config.plugins))
    .tap(emitter.emit("plugins-sorted"))
    .then(registerPlugins)
    .tap(emitter.emit("plugins-registered"))
    .then(startServer)
    .tap(emitter.emit("server-started"))
    .then(invokeInitializerRefresh)
    .then(invokeCcmRefresh)
    .then(logStarted)
    .then(() => server)
    .tap(emitter.emit("complete"))
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

    Confippet.util.merge(hapiServerConfig, serverConfig.server);

    //
    // This will allow Hapi to make config available through
    // server.settings.app.config
    //
    hapiServerConfig.app.config = serverConfig;
    emitter.emit("config-composed");

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

        dnscache(server.app.config.dnscache);

        // Start server

        return startElectrodeServer(server);
      });

  const applyDefaultConfigs = (serverConfig) => {
    const configOptions = {
      dirs: [Path.join(__dirname, "config")],
      warnMissing: false,
      context: {
        deployment: process.env.NODE_ENV
      }
    };

    const defaults = Confippet.store();

    defaults._$.compose(configOptions);
    defaults._$.use(serverConfig);

    return defaults;
  };


  if (appConfig && appConfig.listener) {
    appConfig.listener(emitter);
  }

  const promise = Promise.resolve(appConfig).then(applyDefaultConfigs).then(start);

  return callback ? promise.nodeify(callback) : promise;

};
