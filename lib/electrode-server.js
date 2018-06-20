"use strict";

/* eslint-disable no-magic-numbers */

const Promise = require("bluebird");
const Hapi = require("hapi");
const _ = require("lodash");
const Chalk = require("chalk");
const Path = require("path");
const checkNodeEnv = require("./check-node-env");
const logger = require("./logger.js");
const startFailed = require("./start-failed");
const Confippet = require("electrode-confippet");
const AsyncEventEmitter = require("async-eventemitter");

const MS_PER_SEC = 1000;

function emitEvent(context, event) {
  return new Promise((resolve, reject) => {
    context.emitter.emit(event, context, err => {
      return err ? reject(err) : resolve();
    });
  });
}

function showRegisterPluginsNote(timeout) {
  const noteDelay = Math.ceil(timeout >= 10 * MS_PER_SEC ? timeout / 5 : 2 * MS_PER_SEC); // eslint-disable-line
  const remain = timeout - noteDelay;
  const next = Chalk.red("next()");
  return setTimeout(
    () =>
      logger.warn(
        Chalk.green(`
Register plugins is taking a while - If this takes longer than 10 seconds, then
double check your plugins to make sure each one calls ${next} at the end.

Server will automatically abort after ${remain / MS_PER_SEC} seconds.
`)
      ),
    noteDelay
  );
}

function convertPluginsToArray(plugins) {
  //
  // The module could either be one in node_modules or a file in a path
  // relative to CWD
  // * module in node_modules: no leading "."
  // * file in a directory, relative path with leading "." under CWD, resolve
  //   full path for require
  //
  const fullRequirePath = x => {
    return x.startsWith(".") ? Path.resolve(x) : x;
  };

  const loadModule = p => {
    // if p.register is not defined then use p.module if it's a string
    // else use field name for the plugin if module is not explicitly false
    const getModuleName = () => {
      return !p.register && (_.isString(p.module) ? p.module : p.module !== false && p.__name);
    };

    const name = getModuleName();
    //
    // if has a name for the module to load, then try to load it.
    //
    const doRequire = () => {
      return (
        name &&
        Promise.resolve(fullRequirePath(name))
          .then(require) // use require to load the module
          .catch(error => {
            error.message = `Failed loading module ${name}: ${error.message}`;
            throw error;
          })
          // check ES6 style module
          .then(mod => (p.register = mod.default ? mod.default : mod))
      );
    };

    return Promise.try(doRequire).then(() => p);
  };

  const num = x => {
    return _.isString(x) ? parseInt(x, 10) : x;
  };

  const checkNaN = x => {
    return isNaN(x) ? Infinity : x;
  };

  const priority = p => checkNaN(num(p.priority));
  const isEnable = p => p.enable !== false;
  const transpose = (p, k) => {
    p.__name = k;
    return p;
  };

  //
  // transpose each plugin, filter out disabled ones, and sort by priority
  //
  const pluginsArray = () =>
    _(plugins)
      .map(transpose)
      .filter(isEnable)
      .sortBy(priority)
      .value();

  // convert plugins object to array and check each one if it has a module to load.
  return Promise.try(pluginsArray).map(loadModule);
}

function startElectrodeServer(context) {
  const server = context.server;
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

  const registerPlugins = plugins => {
    const failMsg = (plg, msg) => {
      let withInfo;
      if (plg.module) {
        withInfo = `with module '${plg.module}`;
      } else {
        withInfo = `with register function`;
      }
      return `electrode-server register plugin '${plg.__name}' ${withInfo} ${msg}`;
    };
    // making the registerPluginsTimeout configurable by apps
    const timeout = Math.max(3000, config.electrode.registerPluginsTimeout);
    const noteTimeout = showRegisterPluginsNote(timeout);
    return Promise.each(plugins, plg => {
      return new Promise((resolve, reject) => {
        server.register(plg, err => {
          if (err) {
            logger.error(failMsg(plg, "failed"), err);
            reject(err instanceof Error ? err : new Error(err));
          } else {
            resolve();
          }
        });
      })
        .timeout(timeout)
        .catch(Promise.TimeoutError, () => {
          return new Promise((resolve, reject) => {
            server.stop(() => {
              reject(new Error(failMsg(plg, "timeout - did you forget next()?")));
            });
          });
        });
    }).finally(() => clearTimeout(noteTimeout));
  };

  const startServer = () =>
    new Promise((resolve, reject) => {
      server.start(err => {
        return err ? reject(err) : resolve();
      });
    });

  const logStarted = () => {
    _.each(server.connections, conn => {
      logger.info(Chalk.green(`\nHapi.js server running at ${conn.info.uri}\n`));
    });
  };

  return emitEvent(context, "server-created")
    .then(setConnections)
    .tap(() => emitEvent(context, "connections-set"))
    .then(() => convertPluginsToArray(config.plugins))
    .tap(plugins => {
      context.plugins = plugins;
      return emitEvent(context, "plugins-sorted");
    })
    .then(registerPlugins)
    .tap(() => emitEvent(context, "plugins-registered"))
    .then(startServer)
    .tap(() => emitEvent(context, "server-started"))
    .then(logStarted)
    .then(() => server)
    .tap(() => emitEvent(context, "complete"))
    .catch(startFailed);
}

module.exports = function electrodeServer(appConfig, decors, callback) {
  const check = () => {
    checkNodeEnv();

    appConfig = appConfig || {};

    if (_.isFunction(decors)) {
      callback = decors;
      decors = [];
    } else {
      decors = decors || [];
      if (!_.isArray(decors)) {
        decors = [decors];
      }
    }
  };

  check();

  const makeHapiServerConfig = context => {
    const hapiServerConfig = {
      app: {
        electrodeServer: true
      }
    };

    Confippet.util.merge(hapiServerConfig, context.config.server);

    // Set the log level (if no config value set, then we log all)
    logger.setLevel(_.get(context, "config.electrode.logLevel"));

    //
    // This will allow Hapi to make config available through
    // server.settings.app.config
    //
    hapiServerConfig.app.config = context.config;

    return hapiServerConfig;
  };

  const start = context =>
    Promise.try(() => new Hapi.Server(makeHapiServerConfig(context))).then(server => {
      context.server = server;

      //
      // Make config available in server.app.config, in addition to
      // server.settings.app.config
      //
      server.app.config = server.settings.app.config;

      // Start server

      return startElectrodeServer(context);
    });

  const applyDecorConfigs = context => {
    // load internal defaults
    const configOptions = {
      dirs: [Path.join(__dirname, "config")],
      warnMissing: false,
      failMissing: false,
      context: {
        deployment: process.env.NODE_ENV
      }
    };

    const defaults = Confippet.store();
    defaults._$.compose(configOptions);

    // apply decors
    decors.forEach(d => defaults._$.use(d));

    // apply appConfig
    defaults._$.use(appConfig);

    context.config = defaults;

    delete defaults.listener;

    return context;
  };

  const setListeners = context => {
    context.emitter = new AsyncEventEmitter();
    decors.forEach(d => {
      return d.listener && d.listener(context.emitter);
    });

    if (appConfig.listener) {
      appConfig.listener(context.emitter);
    }

    return context;
  };

  const promise = Promise.resolve({})
    .tap(setListeners)
    .tap(applyDecorConfigs)
    .tap(context => emitEvent(context, "config-composed"))
    .then(start);

  return callback ? promise.nodeify(callback) : promise;
};
