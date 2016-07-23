"use strict";

const checkNodeEnv = require("../../lib/check-node-env.js");
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
    checkNodeEnv();
    done();
  });

  it("should do nothing for full NODE_ENV", function (done) {
    ["production", "staging", "development"].forEach((x) => {
      process.env.NODE_ENV = x;
      checkNodeEnv();
    });
    done();
  });

  it("should print warning for unexpected NODE_ENV", function (done) {
    const w = console.warn;
    let msg;
    console.warn = (m) => {
      msg = m;
    };
    process.env.NODE_ENV = "undefined";
    checkNodeEnv();
    console.warn = w;
    Chai.expect(msg).includes("should be empty or one of");
    done();
  });

});
