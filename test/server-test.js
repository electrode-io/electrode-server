"use strict";

const electrodeServer = require("..");
const chai = require("chai");
const _ = require("lodash");
const request = require("superagent");
const Bluebird = require("bluebird");

describe("electrode-server", function () {

  const stopServer = (server) =>
    new Bluebird((resolve, reject) =>
      server.stop((stopErr) => stopErr ? reject(stopErr) : resolve()));

  const verifyServer = (server) => new Bluebird((resolve) => {
    request.get("http://localhost:3000/html/test.html").end((err, resp) => {
      chai.assert.equal(err.message, "Not Found");
      chai.assert.equal(err.status, 404);
      chai.assert.ok(resp, "No response from server");
      chai.assert.ok(resp.body, "Response has no body");
      chai.assert.equal(resp.body.error, "Not Found");
      chai.assert.equal(resp.body.statusCode, 404);
      resolve(server);
    });
  });

  const testSimplePromise = () => electrodeServer({}).then(verifyServer).then(stopServer);

  const testSimpleCallback = () =>
    new Bluebird((resolve, reject) => {
      electrodeServer({}, (err, server) => err ? reject(err) : resolve(server));
    })
      .then(verifyServer)
      .then(stopServer);

  it("should start up a default server twice", function (done) {
    testSimplePromise().then(testSimplePromise).then(done).catch(done);
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
    electrodeServer("./test/data/empty-config.js")
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
      return server;
    };
    electrodeServer("./test/data/server.js")
      .then(verify)
      .then(stopServer)
      .then(() => done())
      .catch(done);
  });

  it("should return static file", function (done) {
    const verifyServerStatic = (server) => new Bluebird((resolve) => {
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
        if (e._err === "plugin_failure") {
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
});
