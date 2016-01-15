"use strict";

const enforceNodeEnv = require("../../lib/enforce-node-env.js");
const Chai = require("chai");

describe("process-env-abbr", function () {
  let saveEnv;

  before(() => {
    saveEnv = process.env.NODE_ENV;
  });

  after(() => {
    if (saveEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = saveEnv;
    }
  });

  it("should do nothing for empty NODE_ENV", function (done) {
    process.env.NODE_ENV = "";
    enforceNodeEnv();
    done();
  });

  it("should do nothing for full NODE_ENV", function (done) {
    ["production", "staging", "development"].forEach((x) => {
      process.env.NODE_ENV = x;
      enforceNodeEnv();
    });
    done();
  });

  it("should fail for bad NODE_ENV", function (done) {
    ["PRODUCTION", "Production", "Staging", "sta", "   ", "undefined"].forEach(
      (x) => {
        process.env.NODE_ENV = x;
        Chai.expect(enforceNodeEnv).to.throw(Error);
      }
    );
    done();
  });

});
