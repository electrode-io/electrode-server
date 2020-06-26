"use strict";

/* eslint-disable no-magic-numbers, prefer-template */

const assert = require("assert");
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
const requireAt = require("require-at");
const { PLUGIN_KEY } = require("./symbols");

const MS_PER_SEC = 1000;

function emitEvent(context, event) {
  const timeout = _.get(context, "config.electrode.eventTimeout");

  if (timeout && !context.emitter._events[event]) {
    return Promise.resolve();
  }

  let promise = new Promise((resolve, reject) => {
    context.emitter.emit(event, context, err => {
      return err ? reject(err) : resolve();
    });
  });

  if (timeout) {
    promise = promise.timeout(timeout);
  }

  return promise.catch(err => {
    err.timeout = timeout;
    err.event = event;
    if (err instanceof Promise.TimeoutError) {
      err.message = `timeout waiting for event '${event}' handler`;
      err.code = "XEVENT_TIMEOUT";
    } else {
      err.message = `event '${event}' handler failed: ${err.message}`;
      err.code = "XEVENT_FAILED";
    }
    throw err;
  });
}

function shouldAutoAbort() {
  const execArgv = process.execArgv;

  //
  // avoid auto aborting in production, or inspect mode in case user is debugging their app
  //
  return (
    process.env.NODE_ENV !== "production" &&
    execArgv.indexOf("--inspect") < 0 &&
    execArgv.indexOf("--inspect-brk") < 0
  );
}

function showRegisterPluginsNote(registerState, timeout) {
  const noteDelay = Math.ceil(
    timeout >= 10 * MS_PER_SEC ? timeout / 5 : Math.min(3000, timeout / 2)
  ); // eslint-disable-line
  const remain = timeout - noteDelay;
  return setTimeout(() => {
    const name = Chalk.magenta(registerState.plugin[PLUGIN_KEY]);
    const abortMsg = shouldAutoAbort()
      ? `

Server will automatically abort after ${remain / MS_PER_SEC} seconds.
`
      : "";
    logger.warn(
      Chalk.green(`
Registering plugin ${name} is taking a while - If this takes longer than 10 seconds, then
double check your plugin to make sure it resolves its promises.${abortMsg}`)
    );
  }, noteDelay).unref();
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

  const topRequireFromPath = plugins.requireFromPath;

  assert(
    !topRequireFromPath || _.isString(topRequireFromPath),
    `config.plugins.requireFromPath must be a string`
  );

  const loadModule = p => {
    if (p.register) {
      const regInfo = {
        plugin: {
          register: p.register,
          pkg: p.pkg || {
            name: p.name || p[PLUGIN_KEY]
          }
        },
        options: p.options,
        [PLUGIN_KEY]: p[PLUGIN_KEY]
      };

      return regInfo;
    }
    // if p.register is not defined then check p.module
    // if no p.module or p.module !== false, then use field name (p[PLUGIN_KEY])

    const getPluginModule = () => {
      const plgKey = p[PLUGIN_KEY];
      const requireFromPath = p.requireFromPath;
      if (_.isString(p.module)) {
        return { name: p.module, requireFromPath };
      } else if (_.isObject(p.module)) {
        assert(p.module.name, `plugin ${plgKey} 'module' must have 'name' field`);
        assert(
          !p.module.requireFromPath || _.isString(p.module.requireFromPath),
          `plugin ${plgKey} 'module.requireFromPath' must be a string`
        );
        return Object.assign({ requireFromPath }, p.module);
      } else if (p.module !== false) {
        return { name: plgKey, requireFromPath };
      }
      throw new Error(`plugin ${plgKey} disable 'module' but has no 'register' field`);
    };

    const doRequire = () => {
      const pluginMod = getPluginModule();

      //
      // if has a name for the module to load, then try to load it.
      //
      let fromPath = pluginMod.requireFromPath || topRequireFromPath;
      let name;
      let xrequire;

      if (fromPath) {
        name = pluginMod.name;
        // use require-at to load the module from path
        xrequire = requireAt(fromPath);
        p.requireFromPath = fromPath;
        fromPath = ` from path: ${fromPath}`;
      } else {
        // use require to load the module
        xrequire = require;
        name = fullRequirePath(pluginMod.name);
        fromPath = p.requireFromPath = "";
      }

      return Promise.try(() => xrequire(name))
        .catch(error => {
          error.message = `Failed loading module ${pluginMod.name}${fromPath}: ${error.message}`;
          throw error;
        })
        .then(mod => {
          // order of fields to look for the hapi plugin from the module:
          // 1. mod.hapiPlugin
          // 2. mod.default.hapiPlugin (ES6)
          // 3. mod.default (ES6)
          // 4. mod
          const pluginField = [
            "hapi17Plugin",
            "default.hapi17Plugin",
            "hapiPlugin",
            "default.hapiPlugin",
            "plugin",
            "default.plugin",
            "default"
          ].find(x => _.get(mod, x));
          // validate plugin
          p.plugin = (pluginField && _.get(mod, pluginField)) || mod;
          const msg =
            `for plugin '${name}'` +
            ((pluginField && ` loaded from exported field '${pluginField}' of its module`) || "");
          assert(p.plugin, `${name} is a falsy value: ${p.plugin} - ${msg}`);
          assert(
            _.get(p.plugin, "pkg.name", p.plugin.name),
            `name or pkg.name is missing - ${msg}`
          );
          assert(typeof p.plugin.register === "function", `register function is missing - ${msg}`);

          return p;
        });
    };

    return Promise.try(doRequire);
  };

  const num = x => {
    return _.isString(x) ? parseInt(x, 10) : x;
  };

  const checkNaN = x => {
    return isNaN(x) ? Infinity : x;
  };

  const priority = p => checkNaN(num(p.priority));
  const isEnable = p => p[PLUGIN_KEY] !== "requireFromPath" && p.enable !== false;
  const transpose = (p, k) => Object.assign({ [PLUGIN_KEY]: k }, p);

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

  const registerPlugins = plugins => {
    const registerMethod = plg => {
      if (plg.module) {
        const fromPath = plg.requireFromPath ? ` from path: '${plg.requireFromPath}'` : "";
        return `with module '${JSON.stringify(plg.module)}'${fromPath}`;
      } else {
        return `with register function`;
      }
    };
    // making the registerPluginsTimeout configurable by apps
    const timeout = _.get(config, "electrode.registerPluginsTimeout", 5000);
    const registerState = {};
    const noteTimeout = showRegisterPluginsNote(registerState, timeout);
    return Promise.each(plugins, plg => {
      registerState.plugin = plg;
      let registerPromise = Promise.resolve(server.register(plg));
      if (shouldAutoAbort()) {
        registerPromise = registerPromise.timeout(timeout);
      }

      return registerPromise.catch(err => {
        if (!err || !err.hasOwnProperty("message")) {
          err = new Error(`None Error received in catch: '${err}'`);
        } else if (err instanceof Promise.TimeoutError) {
          err.message = `timeout - did you return a resolved promise?`;
        }

        err.code = "XPLUGIN_FAILED";
        err.plugin = plg;
        err.method = registerMethod(plg);
        err.preserve = context.preserveError;

        throw err;
      });
    }).finally(() => {
      clearTimeout(noteTimeout);
    });
  };

  let started = false;
  const logStarted = () => {
    logger.info(Chalk.green(`\nHapi.js server running at ${server.info.uri}\n`));
  };

  return emitEvent(context, "server-created")
    .then(() => convertPluginsToArray(config.plugins))
    .tap(plugins => {
      context.plugins = plugins;
      return emitEvent(context, "plugins-sorted");
    })
    .then(registerPlugins)
    .tap(() => {
      return emitEvent(context, "plugins-registered");
    })
    .then(() => server.start())
    .tap(() => {
      started = true;
      return emitEvent(context, "server-started");
    })
    .then(logStarted)
    .then(() => server)
    .tap(() => {
      return emitEvent(context, "complete");
    })
    .catch(err => {
      return Promise.resolve(started && server.stop()).finally(() => startFailed(err));
    });
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
    if (
      context.config.connections &&
      (Object.keys(context.config.connections).length > 1 ||
        typeof context.config.connections.default === "undefined")
    ) {
      throw new Error("`connections` config no longer supported");
    }
    _.assign(hapiServerConfig, context.config.connection || context.config.connections.default);

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

  const promise = Promise.resolve({
    // save an error here to preserve stack trace immediately from user's call in order
    // to return it to give user more meaningful stacks in case an error occurred later
    // that's buried deep in a bunch of async operations.
    preserveError: new Error("Preserved stack from your call to electrodeServer")
  })
    .tap(setListeners)
    .tap(applyDecorConfigs)
    .tap(context => emitEvent(context, "config-composed"))
    .then(start);

  return callback ? promise.nodeify(callback) : promise;
};
