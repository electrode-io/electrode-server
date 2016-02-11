"use strict";

const electrodeServer = require("../..");
const chai = require("chai");
const _ = require("lodash");
const request = require("superagent");
const Promise = require("bluebird");
const startMitm = require("mitm");
const interceptStdout = require("intercept-stdout");

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
    chai.assert(server.settings.app.config, "server.settings.app.config not available");
    chai.assert(server.app.config, "server.app.config not available");
    request.get("http://localhost:3000/html/test.html").end((err, resp) => {
      chai.assert.equal(err.message, "Not Found");
      chai.assert.equal(err.status, HTTP_404);
      chai.assert.ok(resp, "No response from server");
      chai.assert.ok(resp.body, "Response has no body");
      chai.assert.equal(resp.body.error, "Not Found");
      chai.assert.equal(resp.body.statusCode, HTTP_404);
      resolve(server);
    });
  });

  const testSimplePromise = (config) =>
    electrodeServer(config || {}).then(verifyServer).then(stopServer);

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
    chai.assert(false, "expected error from tested code");
  };

  it("should fail for @missing_config", function (done) {
    electrodeServer("test/test/test1.js")
      .then(expectedError)
      .catch((e) => {
        if (_.contains(e.message, "Missing config file")) {
          return done();
        }
        done(e);
      });
  });


  it("should fail for @missing_config @callbacks", function (done) {
    electrodeServer("test/test/test2.js", (err) => {
      if (!err) {
        expectedError();
      }
      done();
    });
  });

  it("should fail for PORT in use", function (done) {

    electrodeServer({}).then((server) =>
        electrodeServer({})
          .then(expectedError)
          .catch((err) => {
            if (_.contains(err.message, "is already in use")) {
              return stopServer(server);
            }
            done(err);
          })
      )
      .then(done);
  });


  it("should fail for @bad_config", function (done) {
    electrodeServer("./test/data/bad-config.js")
      .then(expectedError)
      .catch((e) => {
        if (_.contains(e.message, "Error in config")) {
          return done();
        }
        done(e);
      });
  });


  it("should try to @default_config_location", function (done) {
    electrodeServer()
      .then(expectedError)
      .catch((e) => {
        if (_.contains(e.message, "config/electrode-server/server.js")) {
          return done();
        }
        done(e);
      });
  });

  it("should start up with a good @empty_config", function (done) {
    const verifyServices = (server) => {
      chai.assert(server.app.services[RegClient.providerName],
        "registry service is not present in server.app");
      return server;
    };
    electrodeServer("./test/data/empty-config.js")
      .then(verifyServices)
      .then(stopServer)
      .then(() => done())
      .catch(done);
  });


  it("should start up with @ES6_style_config", function (done) {
    electrodeServer("./test/data/es6-config.js")
      .then(stopServer)
      .then(() => done())
      .catch(done);
  });


  it("should start up with @correct_plugins_priority", function (done) {
    const verify = (server) => {
      chai.assert.ok(server.plugins.testPlugin, "testPlugin missing in server");
      chai.assert.ok(server.plugins.es6StylePlugin, "es6StylePlugin missing in server");
      return server;
    };
    electrodeServer("./test/data/server.js")
      .then(verify)
      .then(stopServer)
      .then(() => done())
      .catch(done);
  });

  it("should return static file", function (done) {
    const verifyServerStatic = (server) => new Promise((resolve) => {
      request.get("http://localhost:3000/html/hello.html").end((err, resp) => {
        chai.assert(resp, "Server didn't return response");
        chai.assert(_.contains(resp.text, "Hello Test!"),
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

    electrodeServer(config)
      .then(verifyServerStatic)
      .then(stopServer)
      .then(() => done())
      .catch(done);
  });

  it("should fail start up due to @plugin_error", function (done) {
    electrodeServer("./test/data/plugin-err.js")
      .then(expectedError)
      .catch((e) => {
        if (e._err.message === "plugin_failure") {
          return done();
        }
        done(e);
      });
  });


  it("should fail start up due to @bad_plugin", function (done) {
    electrodeServer("./test/data/bad-plugin.js")
      .then(expectedError)
      .catch((e) => {
        if (_.contains(e._err.message, "Failed loading module ./test/plugins/err-plugin")) {
          return done();
        }
        done(e);
      });
  });

  it("should fail start up due to @duplicate_plugin", function (done) {
    electrodeServer("./test/data/dup-plugin.js")
      .then(expectedError)
      .catch((e) => {
        if (_.contains(e.message, "error starting the Hapi.js server")) {
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
        "@walmart/electrode-service-initializer": {enable: false}
      }
    })
      .then(stopServer)
      .then(() => done())
      .catch(done)
      .finally(() => {
        mitm.disable();
      });
  });

  it("should log service initializer error to console", function (done) {
    let seen = "failure message not seen";
    const msg = "failure tested";
    const unhook = interceptStdout((txt) => {
      if (_.contains(txt, msg)) {
        seen = msg;
      }
    });
    const mitm = startMitm();
    mitm.on("request", (req, res) => {
      if (req.url === "/electrode/services/discovery/refresh") {
        res.statusCode = 400;
        res.end(msg);
      } else {
        res.end("{}");
      }
    });
    electrodeServer({})
      .then(stopServer)
      .then(() => {
        expect(seen).to.equal(msg);
      })
      .then(() => done())
      .catch(done)
      .finally(() => {
        mitm.disable();
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
    })
      .then(expectedError)
      .catch((e) => {
        expect(e._err.message).to.include("Electrode Server register plugins timeout.  Did you forget next");
        done();
      })
      .catch(done);
  });

  it("should load default config when no environment specified", (done) => {
    electrodeServer({})
      .then((server) => {

        chai.assert.equal(server.app.config.logging.logMode, "development");
        return stopServer(server);
      })
      .then(done);
  });

  it("should load config based on environment", (done) => {
    process.env.NODE_ENV = "production";

    electrodeServer({})
      .then((server) => {
        chai.assert.equal(server.app.config.logging.logMode, "production");
        process.env.NODE_ENV = "test";

        return stopServer(server);
      })
      .then(done);
  });

  it("should skip env config that doesn't exist", (done) => {
    process.env.NODE_ENV = "development";

    electrodeServer({})
      .then((server) => {
        chai.assert.equal(server.app.config.logging.logMode, "development");
        process.env.NODE_ENV = "test";

        return stopServer(server);
      })
      .then(done);
  });

});
