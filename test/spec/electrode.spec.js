"use strict";

const path = require("path");
const electrodeServer = require("../..");
const assert = require("chai").assert;
const _ = require("lodash");
const request = require("superagent");
const Promise = require("bluebird");

const HTTP_404 = 404;

describe("electrode-server", function () {

  this.timeout(10000);

  beforeEach(() => {
    process.env.PORT = 0;
  });

  afterEach(() => {
    delete process.env.PORT;
  });

  const stopServer = (server) =>
    new Promise((resolve, reject) =>
      server.stop((stopErr) => {
        return stopErr ? reject(stopErr) : resolve();
      }));

  const verifyServer = (server) => new Promise((resolve) => {
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
  })
    .catch((err) => {
      stopServer(server);
      throw err;
    });

  const testSimplePromise = (config, decors) =>
    electrodeServer(config, decors).then(verifyServer).then(stopServer);

  const testSimpleCallback = () =>
    new Promise((resolve, reject) => {
      electrodeServer({}, (err, server) => {
        return err ? reject(err) : resolve(server);
      });
    })
      .then(verifyServer)
      .then(stopServer);

  it("should start up a default server twice", function () {
    return testSimplePromise({
      electrode: {
        hostname: "blah-test-923898234" // test bad hostname
      }
    }, [require("../decor/decor1.js")])
      .then(() => testSimplePromise(undefined, require("../decor/decor2")));
  });

  it("should start up a server twice @callbacks", function () {
    return testSimpleCallback().then(testSimpleCallback).then();
  });

  const expectedError = () => {
    assert(false, "expected error from tested code");
  };

  it("should fail for PORT in use", function () {
    return electrodeServer().then((server) =>
      electrodeServer({
        connections: {
          default: {
            port: server.info.port
          }
        }
      })
        .then(expectedError)
        .catch((err) => {
          if (_.includes(err.message, "is already in use")) {
            return stopServer(server);
          }
          throw err;
        })
    );
  });

  it("should fail for listener errors", function () {
    return electrodeServer({}, require("../decor/decor3"))
      .then(expectedError)
      .catch((err) => {
        expect(err.message).includes("test listner error");
      });
  });

  it("should start up with @empty_config", function () {
    return electrodeServer().then(stopServer);
  });

  it("should start up with @correct_plugins_priority", function () {
    const verify = (server) => {
      assert.ok(server.plugins.testPlugin, "testPlugin missing in server");
      assert.ok(server.plugins.es6StylePlugin, "es6StylePlugin missing in server");
      return server;
    };
    return electrodeServer(require("../data/server.js"))
      .then(verify)
      .then(stopServer);
  });

  it("should return static file", function () {
    let server;
    const verifyServerStatic = (s) => new Promise((resolve) => {
      server = s;
      request.get(`http://localhost:${s.info.port}/html/hello.html`)
        .end((err, resp) => {
          assert(resp, "Server didn't return response");
          assert(_.includes(resp.text, "Hello Test!"),
            "response not contain expected string");
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

  it("should fail start up due to @plugin_error", function () {
    return electrodeServer(require("../data/plugin-err.js"))
      .then(expectedError)
      .catch((e) => {
        if (!_.includes(e._err.message, "plugin_failure")) {
          throw e;
        }
      });
  });


  it("should fail start up due to @bad_plugin", function () {
    return electrodeServer(require("../data/bad-plugin.js"))
      .then(expectedError)
      .catch((e) => {
        if (!_.includes(e._err.message, "Failed loading module ./test/plugins/err-plugin")) {
          throw e;
        }
      });
  });

  it("should fail start up due to @duplicate_plugin", function () {
    return electrodeServer(require("../data/dup-plugin.js"))
      .then(expectedError)
      .catch((e) => {
        if (!_.includes(e.message, "error starting the Hapi.js server")) {
          throw e;
        }
      });
  });

  it("should fail with plugins register timeout", () => {
    const register = () => {
    };
    register.attributes = {name: "timeout"};
    return electrodeServer({
      plugins: {
        test: {
          register
        }
      },
      electrode: {
        registerPluginsTimeout: 5000
      }
    })
      .then(expectedError)
      .catch((e) => {
        if (!_.includes(e._err.message, "Electrode Server register plugins timeout.  Did you forget next")) {
          throw e;
        }
      });
  });

  it("should fail if plugin register failed", () => {
    const register = (server, options, next) => {
      next(new Error("test plugin register error"));
    };
    register.attributes = {name: "errorPlugin"};
    return electrodeServer({
      plugins: {
        test: {
          register
        }
      }
    })
      .then(expectedError)
      .catch((e) => {
        if (!_.includes(e._err.message, "test plugin register error")) {
          throw e;
        }
      });

  });

  it("should load default config when no environment specified", () => {
    return electrodeServer()
      .then((server) => {
        assert.equal(server.app.config.electrode.source, "development");
        return stopServer(server);
      });
  });

  it("should load config based on environment", () => {
    process.env.NODE_ENV = "production";

    return electrodeServer()
      .then((server) => {
        assert.equal(server.app.config.electrode.source, "production");
        process.env.NODE_ENV = "test";

        return stopServer(server);
      });
  });

  it("should skip env config that doesn't exist", () => {
    process.env.NODE_ENV = "development";

    return electrodeServer()
      .then((server) => {
        assert.equal(server.app.config.electrode.source, "development");
        process.env.NODE_ENV = "test";

        return stopServer(server);
      });
  });

  it("should emit lifecycle events", function () {
    const events = ["config-composed", "server-created", "plugins-sorted",
      "plugins-registered", "server-started", "complete"];

    const firedEvents = _.times(events.length, _.constant(false));

    const eventListener = (emitter) => {
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

    return electrodeServer(options)
      .then((server) => {
        assert(firedEvents.indexOf(false) === -1, "failed to fire event.");
        return stopServer(server);
      });
  });

  it("displays a startup banner at startup time", () => {
    const l = console.log;
    let msg;
    console.log = (m) => {
      msg = m;
    };
    return electrodeServer()
      .then((server) => {
        console.log = l;
        assert.include(msg, "Hapi.js server running");
        return stopServer(server);
      });
  });

  it("displays no startup banner at startup time if supressStartupBanner=true", () => {
    const l = console.log;
    let msg;
    console.log = (m) => {
      msg = m;
    };
    return electrodeServer({
      electrode: {
        suppressStartupBanner: true
      }
    })
      .then((server) => {
        console.log = l;
        assert.isUndefined(msg);
        return stopServer(server);
      });
  });

});
