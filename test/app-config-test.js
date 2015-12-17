"use strict";

const appConfig = require("../lib/plugins/app-config.js");
const chai = require("chai");

describe("app-config-plugin", function () {
  this.timeout(50);
  it("should add config to req.app", function (done) {
    let extFn;
    const server = {
      ext: (event, fn) => {
        chai.assert.equal(event, "onRequest");
        extFn = fn;
      },
      app: {
        config: {
          server: true
        }
      }
    };
    const request = {
      app: {}
    };
    let continued = false;
    const reply = {
      "continue": () => {
        continued = true;
      }
    };
    appConfig(server, {}, () => {
      chai.assert(extFn, "extension not registered");
      extFn(request, reply);
      chai.assert(continued, "continue not called");
      chai.assert(request.app.config, "no request.app.config");
      done();
    });
  });
});

