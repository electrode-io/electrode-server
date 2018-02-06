"use strict";

const Chai = require("chai");
const logger = require("../../lib/logger.js");
const sinon = require("sinon");

describe("logger", function() {
  let sandbox;

  before(() => {
    sandbox = sinon.createSandbox();
  });

  after(() => {
    sandbox.restore();
  });

  const stubConsole = m => {
    const r = {};
    r.stub = sandbox.stub(console, m).callsFake((a, b, c) => {
      r.result = [a, b, c];
    });
    r.restore = () => r.stub.restore();
    return r;
  };

  describe("setLevel()", () => {
    it("throws an Error if it is passed an unknown level", () => {
      Chai.expect(() => logger.setLevel("bogus")).to.throw(
        `Log level must be one of info, warn, error, none. Received "bogus".`
      );
    });
  });

  describe("info()", () => {
    it("logs an info message if the level is set to info", () => {
      logger.setLevel("info");
      const stub = stubConsole("info");
      logger.info(1, 2, 3);
      stub.restore();

      expect(stub.result).to.deep.equal([1, 2, 3]);
    });

    it("logs no info message if the level is set to warn", () => {
      logger.setLevel("warn");

      const stub = stubConsole("info");
      logger.info(1, 2, 3);
      stub.restore();

      expect(stub.result).to.deep.equal(undefined);
    });
  });

  describe("warn()", () => {
    it("logs a warn message if the level is set to info", () => {
      logger.setLevel("info");

      const stub = stubConsole("warn");
      logger.warn(1, 2, 3);
      stub.restore();

      expect(stub.result).to.deep.equal([1, 2, 3]);
    });

    it("logs a warn message if the level is set to warn", () => {
      logger.setLevel("warn");

      const stub = stubConsole("warn");
      logger.warn(1, 2, 3);
      stub.restore();

      expect(stub.result).to.deep.equal([1, 2, 3]);
    });

    it("logs no warn message if the level is set to error", () => {
      logger.setLevel("error");

      const stub = stubConsole("warn");
      logger.warn(1, 2, 3);
      stub.restore();

      expect(stub.result).to.deep.equal(undefined);
    });
  });

  describe("error()", () => {
    it("logs an error message if the level is set to warn", () => {
      logger.setLevel("warn");

      const stub = stubConsole("error");
      logger.error(1, 2, 3);
      stub.restore();

      expect(stub.result).to.deep.equal([1, 2, 3]);
    });

    it("logs an error message if the level is set to error", () => {
      logger.setLevel("error");

      const stub = stubConsole("error");
      logger.error(1, 2, 3);
      stub.restore();

      expect(stub.result).to.deep.equal([1, 2, 3]);
    });

    it("logs no error message if the level is set to none", () => {
      logger.setLevel("none");

      const stub = stubConsole("error");
      logger.error(1, 2, 3);
      stub.restore();

      expect(stub.result).to.deep.equal(undefined);
    });
  });
});
