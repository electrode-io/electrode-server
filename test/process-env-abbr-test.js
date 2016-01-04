"use strict";

const processEnvAbbr = require("../lib/process-env-abbr");
const Chai = require("chai");

describe("process-env-abbr", function () {
  function testUnchanged(testValue) {
    process.env.NODE_ENV = testValue;
    processEnvAbbr();
    Chai.assert.equal(process.env.NODE_ENV, testValue);
  }

  function testChanged(env, expected) {
    process.env.NODE_ENV = env;
    processEnvAbbr();
    Chai.assert.equal(process.env.NODE_ENV, expected);
  }

  it("should do nothing for empty NODE_ENV", function (done) {
    testUnchanged('');
    done();
  });

  it("should do nothing for full NODE_ENV", function (done) {
    ["production", "staging", "development", "test"].forEach(testUnchanged);
    done();
  });

  it("should change to production NODE_ENV", function (done) {
    ["PRODUCTION", "Production", "PROD", "productio", "pro", "prod", "produc"].forEach(
      (x) => testChanged(x, "production")
    );
    done();
  });

  it("should change to staging NODE_ENV", function (done) {
    ["STAGING", "Staging", "STAG", "stagin", "sta", "stag", "stagi"].forEach(
      (x) => testChanged(x, "staging")
    );
    done();
  });

  it("should change to development NODE_ENV", function (done) {
    ["DEVELOPMENT", "Develop", "DEVEL", "devel", "dev", "deve", "develo"].forEach(
      (x) => testChanged(x, "development")
    );
    done();
  });
});
