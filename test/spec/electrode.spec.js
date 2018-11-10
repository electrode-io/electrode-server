"use strict";

const path = require("path");
const electrodeServer = require("../..");
const assert = require("chai").assert;
const _ = require("lodash");
const request = require("superagent");
const Promise = require("bluebird");

const HTTP_404 = 404;

describe("electrode-server", function() {
  const logLevel = "none";

  this.timeout(10000);

  beforeEach(() => {
    process.env.PORT = 0;
  });

  afterEach(() => {
    delete process.env.PORT;
  });

  const stopServer = server => server.stop();

  const verifyServer = server =>
    new Promise(resolve => {
      assert(server.settings.app.config, "server.settings.app.config not available");
      assert(server.app.config, "server.app.config not available");
      request.get(`http://localhost:${server.info.port}/html/test.html`).end((err, resp) => {
        assert.equal(err.message, "Not Found");
        assert.equal(err.status, HTTP_404);
        assert.ok(resp, "No response from server");
        assert.ok(resp.body, "Response has no body");
        assert.equal(resp.body.error, "Not Found");
        assert.equal(resp.body.statusCode, HTTP_404);
        resolve(server);
      });
    }).catch(err => {
      stopServer(server);
      throw err;
    });

  const testSimplePromise = (config, decors) =>
    electrodeServer(config, decors)
      .then(verifyServer)
      .then(stopServer);

  const testSimpleCallback = () =>
    new Promise((resolve, reject) => {
      electrodeServer({}, (err, server) => {
        return err ? reject(err) : resolve(server);
      });
    })
      .then(verifyServer)
      .then(stopServer);

  it("should start up a default server twice", function() {
    return testSimplePromise(
      {
        electrode: {
          logLevel,
          hostname: "blah-test-923898234" // test bad hostname
        }
      },
      [require("../decor/decor1.js")]
    ).then(() => testSimplePromise(undefined, require("../decor/decor2")));
  });

  it("should start up a server twice @callbacks", function() {
    return testSimpleCallback()
      .then(testSimpleCallback)
      .then();
  });

  it("should make default connections the connection", function() {
    return electrodeServer({
      connections: {
        default: {
          port: 9010
        }
      }
    }).then(server => {
      expect(server.info.port).eq(9010);
      stopServer(server);
    });
  });

  it("connections without default throws error", function() {
    return electrodeServer({
      connections: {
        simple: {
          port: 9011
        }
      }
    })
      .then(() => {
        expect.fail("Should have failed");
      })
      .catch(err => {
        expect(err).instanceof(Error);
        expect(err.message).eq("`connections` config no longer supported");
      });
  });

  it("should fail for PORT in use", function() {
    let error;
    return electrodeServer().then(server =>
      electrodeServer({
        connection: {
          port: server.info.port
        },
        electrode: {
          logLevel
        }
      })
        .catch(e => (error = e))
        .then(() => {
          expect(error, "expected error thrown").to.exist;
          if (_.includes(error.message, "is already in use")) {
            return stopServer(server);
          }
          throw error;
        })
    );
  });

  it("should fail for listener errors", function() {
    let error;
    return electrodeServer({}, require("../decor/decor3"))
      .catch(e => (error = e))
      .then(() => {
        expect(error, "expected error thrown").to.exist;
        expect(error.message).includes("test listner error");
      });
  });

  it("should fail if plugins.requireFromPath is not string", function() {
    let error;
    return electrodeServer({ electrode: { logLevel: "none" }, plugins: { requireFromPath: {} } })
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        expect(error.message).contains("config.plugins.requireFromPath must be a string");
      });
  });

  it("should fail if can't load module from requireFromPath", function() {
    let error;
    return electrodeServer({
      electrode: { logLevel: "none" },
      plugins: {
        requireFromPath: "/tmp",
        inert: {}
      }
    })
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        expect(error.message).contains(
          "Failed loading module inert from path: /tmp: Cannot find module 'inert'"
        );
      });
  });

  it("should fail if can't load module from module.requireFromPath", function() {
    let error;
    return electrodeServer({
      electrode: { logLevel: "none" },
      plugins: {
        inert: {
          module: {
            requireFromPath: "/tmp",
            name: "inert"
          }
        }
      }
    })
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        expect(error.message).contains(
          "Failed loading module inert from path: /tmp: Cannot find module 'inert'"
        );
      });
  });

  it("should start up with @empty_config", function() {
    return electrodeServer().then(stopServer);
  });

  it("should start up with @correct_plugins_priority", function() {
    const verify = server => {
      assert.ok(server.plugins.testPlugin, "testPlugin missing in server");
      assert.ok(server.plugins.es6StylePlugin, "es6StylePlugin missing in server");
      return server;
    };
    return electrodeServer(require("../data/server.js"))
      .then(verify)
      .then(stopServer);
  });

  it("should return static file", function() {
    let server;
    const verifyServerStatic = s =>
      new Promise(resolve => {
        server = s;
        request.get(`http://localhost:${s.info.port}/html/hello.html`).end((err, resp) => {
          assert(resp, "Server didn't return response");
          assert(_.includes(resp.text, "Hello Test!"), "response not contain expected string");
          resolve(server);
        });
      });

    const config = {
      plugins: {
        appConfig: {
          module: path.join(__dirname, "../plugins/app-config"),
          options: {}
        },
        staticPaths2: {
          options: {
            pathPrefix: "test/dist"
          }
        }
      }
    };

    return electrodeServer(config, [require("../decor/decor-static-paths")])
      .then(verifyServerStatic)
      .finally(() => stopServer(server));
  });

  it("should fail for invalid plugin spec", function() {
    let error;
    return electrodeServer({
      electrode: { logLevel: "none" },
      plugins: { invalid: { module: false } }
    })
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        expect(error.message).contains(
          `plugin invalid disable 'module' but has no 'register' field`
        );
      });
  });

  it("should fail start up due to @plugin_error", function() {
    let error;
    return electrodeServer(require("../data/plugin-err.js"))
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        if (!_.includes(error.message, "plugin_failure")) {
          throw error;
        }
      });
  });

  it("should fail start up due to @bad_plugin", function() {
    let error;
    return electrodeServer(require("../data/bad-plugin.js"))
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        if (!_.includes(error.message, "Failed loading module ./test/plugins/err-plugin")) {
          throw error;
        }
      });
  });

  it("should fail start up due to @duplicate_plugin", function() {
    let error;
    return electrodeServer(require("../data/dup-plugin.js"))
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        if (!_.includes(error.message, "Plugin nulPlugin already registered")) {
          throw error;
        }
      });
  });

  it("should fail with plugins register timeout", () => {
    const register = () => {
      return new Promise(() => {});
    };
    let error;
    return electrodeServer({
      plugins: {
        test: {
          register,
          name: "timeout"
        }
      },
      electrode: {
        logLevel,
        registerPluginsTimeout: 5000
      }
    })
      .catch(e => (error = e))
      .then(() => {
        if (
          !_.includes(
            error.message,
            "electrode-server register plugin 'test' with register function timeout - did you return a resolved promise?"
          )
        ) {
          throw error;
        }
      });
  });

  it("should fail if plugin register returned error", () => {
    const register = () => {
      throw new Error("test plugin register returning error");
    };
    let error;
    return electrodeServer({
      plugins: {
        test: {
          register,
          name: "errorPlugin"
        }
      },
      electrode: {
        logLevel
      }
    })
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        if (!_.includes(error.message, "test plugin register returning error")) {
          throw error;
        }
      });
  });

  it("should fail if plugin with module register returned error", () => {
    let error;
    return electrodeServer({
      plugins: {
        test: {
          module: path.join(__dirname, "../plugins/fail-plugin")
        }
      },
      electrode: {
        logLevel
      }
    })
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        if (!_.includes(error.message, "fail-plugin")) {
          throw error;
        }
      });
  });

  it("should fail if plugin with requireFromPath and module register returned error", () => {
    let error;
    return electrodeServer({
      plugins: {
        test: {
          requireFromPath: __dirname,
          module: "../plugins/fail-plugin"
        }
      },
      electrode: {
        logLevel
      }
    })
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        if (!_.includes(error.message, "fail-plugin")) {
          throw error;
        }
      });
  });

  it("should fail if plugin register failed", () => {
    const register = () => {
      throw new Error("test plugin failure");
    };
    let error;
    return electrodeServer({
      plugins: {
        test: {
          register,
          name: "errorPlugin"
        }
      },
      electrode: {
        logLevel
      }
    })
      .catch(e => (error = e))
      .then(() => {
        expect(error).to.exist;
        if (!_.includes(error.message, "test plugin failure")) {
          throw error;
        }
      });
  });

  it("should load default config when no environment specified", () => {
    return electrodeServer().then(server => {
      assert.equal(server.app.config.electrode.source, "development");
      return stopServer(server);
    });
  });

  it("should load config based on environment", () => {
    process.env.NODE_ENV = "production";

    return electrodeServer().then(server => {
      assert.equal(server.app.config.electrode.source, "production");
      process.env.NODE_ENV = "test";

      return stopServer(server);
    });
  });

  it("should skip env config that doesn't exist", () => {
    process.env.NODE_ENV = "development";

    return electrodeServer().then(server => {
      assert.equal(server.app.config.electrode.source, "development");
      process.env.NODE_ENV = "test";

      return stopServer(server);
    });
  });

  it("should emit lifecycle events", function() {
    const events = [
      "config-composed",
      "server-created",
      "plugins-sorted",
      "plugins-registered",
      "server-started",
      "complete"
    ];

    const firedEvents = _.times(events.length, _.constant(false));

    const eventListener = emitter => {
      _.each(events, (event, index) => {
        emitter.on(event, (data, next) => {
          firedEvents[index] = true;
          assert(data, "data should be set");
          assert(data.config, "config values should be set");

          assert(index > 0 ? data.server : true, "server should be set");
          assert(index > 1 ? data.plugins : true, `plugins should be set`);
          next();
        });
      });
    };

    const options = {
      listener: eventListener
    };

    return electrodeServer(options).then(server => {
      assert(firedEvents.indexOf(false) === -1, "failed to fire event.");
      return stopServer(server);
    });
  });

  it("displays a startup banner at startup time", () => {
    const i = console.info;
    let msg;
    console.info = m => {
      msg = m;
    };
    return electrodeServer().then(server => {
      console.info = i;
      assert.include(msg, "Hapi.js server running");
      return stopServer(server);
    });
  });

  it("displays no startup banner at startup time if logLevel is set to something other than info", () => {
    const i = console.info;
    let msg;
    console.info = m => {
      msg = m;
    };
    return electrodeServer({
      electrode: {
        logLevel: "warn"
      }
    }).then(server => {
      console.info = i;
      assert.isUndefined(msg);
      return stopServer(server);
    });
  });
});
