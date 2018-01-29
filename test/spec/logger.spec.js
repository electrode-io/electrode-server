"use strict";

const Chai = require("chai");
const logger = require("../../lib/logger.js");

describe("logger", function() {
  describe("setLevel()", () => {
    it("throws an Error if it is passed an unknown level", () => {
      Chai.expect(() => logger.setLevel("bogus")).to.throw(
        `Log level must be one of info, warn, error. Received "bogus".`
      );
    });
  });

  describe("info()", () => {
    it("logs an info message if the level is set to info", () => {
      logger.setLevel("info");
      let result;
      console.info = (...values) => {
        result = values;
      };

      logger.info(1, 2, 3);

      Chai.expect(result).to.deep.equal([1, 2, 3]);
    });

    it("logs no info message if the level is set to warn", () => {
      logger.setLevel("warn");
      let result;
      console.info = (...values) => {
        result = values;
      };

      logger.info(1, 2, 3);

      Chai.expect(result).to.be.undefined;
    });
  });

  describe("warn()", () => {
    it("logs a warn message if the level is set to info", () => {
      logger.setLevel("info");
      let result;
      console.warn = (...values) => {
        result = values;
      };

      logger.warn(1, 2, 3);

      Chai.expect(result).to.deep.equal([1, 2, 3]);
    });

    it("logs a warn message if the level is set to warn", () => {
      logger.setLevel("warn");
      let result;
      console.warn = (...values) => {
        result = values;
      };

      logger.warn(1, 2, 3);

      Chai.expect(result).to.deep.equal([1, 2, 3]);
    });

    it("logs no warn message if the level is set to error", () => {
      logger.setLevel("error");
      let result;
      console.warn = (...values) => {
        result = values;
      };

      logger.warn(1, 2, 3);

      Chai.expect(result).to.be.undefined;
    });
  });

  describe("error()", () => {
    it("logs an error message if the level is set to warn", () => {
      logger.setLevel("warn");
      let result;
      console.error = (...values) => {
        result = values;
      };

      logger.error(1, 2, 3);

      Chai.expect(result).to.deep.equal([1, 2, 3]);
    });

    it("logs an error message if the level is set to error", () => {
      logger.setLevel("error");
      let result;
      console.error = (...values) => {
        result = values;
      };

      logger.error(1, 2, 3);

      Chai.expect(result).to.deep.equal([1, 2, 3]);
    });
  });
});
