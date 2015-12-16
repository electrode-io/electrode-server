/* eslint-env mocha */
/* eslint-disable strict, max-statements, no-invalid-this, prefer-arrow-callback */
"use strict";

const electrodeServer = require("..");
const chai = require("chai");
const _ = require("lodash");

describe("electrode-server", function () {

  it("should start up a default server twice", function (done) {
    const x2 = () => electrodeServer({})
      .then((server) => server.stop(done))
      .catch(done);

    electrodeServer({})
      .then((server) => {
        server.stop(x2);
      })
      .catch(done);
  });


  it("should start up a server twice @callbacks", function (done) {

    const x2 = () => electrodeServer({}, (err, server) => server.stop(done));
    electrodeServer({}, (err, server) => {
      server.stop(x2);
    });
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
      .then((server) => {
        server.stop(() => done());
      })
      .catch(done);
  });


  it("should start up with @ES6_style_config", function (done) {
    electrodeServer("./test/data/es6-config.js")
      .then((server) => {
        server.stop(() => done());
      })
      .catch(done);
  });


  it("should start up with @correct_plugins_priority", function (done) {
    electrodeServer("./test/data/server.js")
      .then((server) => {
        server.stop(() => done());
      })
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
