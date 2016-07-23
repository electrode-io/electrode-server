"use strict";

const electrodeServer = require("../..");
const assert = require("chai").assert;
const _ = require("lodash");
const request = require("superagent");
const Promise = require("bluebird");
const startMitm = require("mitm");
const interceptStdout = require("intercept-stdout");
const wmlDecor = require("../../lib/wml");

const RegClient = require("@walmart/service-registry-client");

const HTTP_404 = 404;

describe("electrode-server", function () {

  this.timeout(10000);

  const stopServer = (server) =>
    new Promise((resolve, reject) =>
      server.stop((stopErr) => {
        return stopErr ? reject(stopErr) : resolve();
      }));

  const verifyServer = (server) => new Promise((resolve) => {
    assert(server.settings.app.config, "server.settings.app.config not available");
    assert(server.app.config, "server.app.config not available");
    request.get("http://localhost:3000/html/test.html").end((err, resp) => {
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

  const testSimplePromise = (config) =>
    electrodeServer(config, wmlDecor()).then(verifyServer).then(stopServer);

  const testSimpleCallback = () =>
    new Promise((resolve, reject) => {
      electrodeServer({}, (err, server) => {
        return err ? reject(err) : resolve(server);
      });
    })
      .then(verifyServer)
      .then(stopServer);

  it("should start up a default server twice", function (done) {
    testSimplePromise({
      electrode: {
        hostname: "blah-test-923898234" // test bad hostname
      }
    })
      .then(() => testSimplePromise())
      .then(done)
      .catch(done);
  });

  it("should start up a server twice @callbacks", function (done) {
    testSimpleCallback().then(testSimpleCallback).then(done).catch(done);
  });

  const expectedError = () => {
    assert(false, "expected error from tested code");
  };

  it("should fail for PORT in use", function (done) {

    electrodeServer().then((server) =>
      electrodeServer()
        .then(expectedError)
        .catch((err) => {
          if (_.includes(err.message, "is already in use")) {
            return stopServer(server);
          }
          done(err);
        })
    )
      .then(done);
  });

  it("should start up with @empty_config", function (done) {
    const verifyServices = (server) => {
      assert(server.app.services[RegClient.providerName],
        "registry service is not present in server.app");
      return server;
    };
    electrodeServer(undefined, wmlDecor())
      .then(verifyServices)
      .then(stopServer)
      .then(() => done())
      .catch(done);
  });

  it("should start up with @correct_plugins_priority", function (done) {
    const verify = (server) => {
      assert.ok(server.plugins.testPlugin, "testPlugin missing in server");
      assert.ok(server.plugins.es6StylePlugin, "es6StylePlugin missing in server");
      return server;
    };
    electrodeServer(require("../data/server.js"), wmlDecor())
      .then(verify)
      .then(stopServer)
      .then(() => done())
      .catch(done);
  });

  it("should return static file", function (done) {
    const verifyServerStatic = (server) => new Promise((resolve) => {
      request.get("http://localhost:3000/html/hello.html")
        .set("Cookie", `a=1;; b=123;;c=4;e=;f=" 12345"`) // should ignore cookie parsing errors
        .end((err, resp) => {
          assert(resp, "Server didn't return response");
          assert(_.includes(resp.text, "Hello Test!"),
            "response not contain expected string");
          resolve(server);
        });
    });

    const config = {
      plugins: {
        staticPaths: {
          options: {
            pathPrefix: "test/"
          }
        }
      }
    };

    electrodeServer(config, wmlDecor())
      .then(verifyServerStatic)
      .then(stopServer)
      .then(() => done())
      .catch(done);
  });

  it("should fail start up due to @plugin_error", function (done) {
    electrodeServer(require("../data/plugin-err.js"), wmlDecor())
      .then(expectedError)
      .catch((e) => {
        if (e._err.message === "plugin_failure") {
          return done();
        }
        done(e);
      });
  });


  it("should fail start up due to @bad_plugin", function (done) {
    electrodeServer(require("../data/bad-plugin.js"), wmlDecor())
      .then(expectedError)
      .catch((e) => {
        if (_.includes(e._err.message, "Failed loading module ./test/plugins/err-plugin")) {
          return done();
        }
        done(e);
      });
  });

  it("should fail start up due to @duplicate_plugin", function (done) {
    electrodeServer(require("../data/dup-plugin.js"), wmlDecor())
      .then(expectedError)
      .catch((e) => {
        if (_.includes(e.message, "error starting the Hapi.js server")) {
          done();
        } else {
          done(e);
        }
      });
  });

  it("should skip service initializer if it's not enabled", function (done) {
    const mitm = startMitm();
    mitm.on("request", (req, res) => {
      if (req.url === "/electrode/services/discovery/refresh") {
        throw new Error("not expecting request");
      } else {
        res.end("{}");
      }
    });
    electrodeServer({
      services: {
        registryRefreshPath: ""
      },
      plugins: {
        "@walmart/electrode-service-initializer": {enable: false},
        "@walmart/electrode-ccm-initializer": {enable: false}
      }
    }, wmlDecor())
      .then(stopServer)
      .then(() => done())
      .catch(done)
      .finally(() => {
        mitm.disable();
      });
  });

  it("should log service initializer error to console", function (done) {
    let seen = "failure message not seen";
    const msg = "returned status 404";
    const unhook = interceptStdout((txt) => {
      if (_.includes(txt, msg)) {
        seen = msg;
      }
    });
    electrodeServer({
      plugins: {
        // disable the plugins so refresh route will return 404 error
        "@walmart/electrode-service-initializer": {enable: false},
        "@walmart/electrode-ccm-initializer": {enable: false}
      }
    }, wmlDecor())
      .then(stopServer)
      .then(() => {
        expect(seen).to.equal(msg);
      })
      .then(() => done())
      .catch(done)
      .finally(() => {
        unhook();
      });
  });

  it("should fail with plugins register timeout", (done) => {
    const register = () => {
    };
    register.attributes = {name: "timeout"};
    electrodeServer({
      plugins: {
        test: {
          register
        }
      }
    }, wmlDecor())
      .then(expectedError)
      .catch((e) => {
        expect(e._err.message).to.include("Electrode Server register plugins timeout.  Did you forget next");
        done();
      })
      .catch(done);
  });

  it("should load default config when no environment specified", (done) => {
    electrodeServer(undefined, wmlDecor())
      .then((server) => {

        assert.equal(server.app.config.logging.logMode, "development");
        return stopServer(server);
      })
      .then(done);
  });

  it("should load config based on environment", (done) => {
    process.env.NODE_ENV = "production";

    electrodeServer(undefined, wmlDecor())
      .then((server) => {
        assert.equal(server.app.config.logging.logMode, "production");
        process.env.NODE_ENV = "test";

        return stopServer(server);
      })
      .then(done);
  });

  it("should skip env config that doesn't exist", (done) => {
    process.env.NODE_ENV = "development";

    electrodeServer(undefined, wmlDecor())
      .then((server) => {
        assert.equal(server.app.config.logging.logMode, "development");
        process.env.NODE_ENV = "test";

        return stopServer(server);
      })
      .then(done);
  });

  it("should emit lifecycle events", function (done) {
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

    electrodeServer(options, wmlDecor())
      .then((server) => {
        assert(firedEvents.indexOf(false) === -1, "failed to fire event.");
        return stopServer(server);
      }).then(done);
  });

  describe("test ccm", function () {

    const config = {
      services: {
        privateKey: {},
        providers: {
          "@walmart/electrode-ccm-client": {
            "options": {
              artifactId: "qa-service",
              cloudEnvironment: "qa",
              cloudDc: "qa",
              environment: "qa"
            }
          }
        }
      },
      ccm: {
        autoLoad: true,
        interval: 0.3,
        keys: {}
      }
    };
    process.env.NODE_ENV = "development";

    const fs = require("fs");
    const dir = `${process.cwd()}/.ccm`;
    const file = `${dir}/snapshot.json`;

    const cleanTmp = () => {
      fs.unlink(file, () => {
        fs.rmdir(dir);
      });
    };

    it("should get ccm configs after server start", (done) => {
      electrodeServer(config, wmlDecor())
        .then((server) => {
          assert(server.app.ccm._lastRefreshed);
          server.app.config.ccm.keys.root = {
            "data": {
              "atlasXO": {
                "serviceName": "atlas-checkout",
                "+configNames": [
                  "guest-checkout",
                  "responsive-config",
                  "opinion-lab"
                ]
              }
            }
          };
          return new Promise((resolve) => {
            const check = () => {
              const g = server.app.ccm.atlasXO;
              if (g && g.enable_guest_email) {
                resolve();
              } else {
                setTimeout(check, 100);
              }
            };
            setTimeout(check, 100);
          })
            .timeout(5000)
            .catch(Promise.TimeoutError, () => {
              throw new Error("CCM was not refreshed before timeout");
            })
            .then(() => {
              stopServer(server);
            })
            .then(done)
            .catch(done)
            .finally(cleanTmp);
        });
    });

    it("should have a default interval", (done) => {
      const cfg = _.cloneDeep(config);
      cfg.ccm.interval = 0;
      electrodeServer(cfg, wmlDecor())
        .then((server) => {
          assert(server.app.ccm._lastRefreshed, "ccm not loaded");
          assert(server.app.refreshers.ccm.interval > 0, "ccm refresh interval not > 0");
          stopServer(server);
        })
        .then(done)
        .catch(done)
        .finally(cleanTmp);
    });

    it("should not load CCM if autoLoad is not set true", (done) => {
      const cfg = _.cloneDeep(config);
      delete cfg.ccm.autoLoad;
      electrodeServer(cfg, wmlDecor())
        .then((server) => {
          assert(!server.app.ccm._lastRefreshed, "ccm should not be loaded");

          stopServer(server);
        })
        .then(done)
        .catch(done);
    });
  });

});
