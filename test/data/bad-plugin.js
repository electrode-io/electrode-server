"use strict";

module.exports = {
  pageTitle: "test 1",

  plugins: {
    errPlugin: {
      module: "./test/plugins/err-plugin"
    }
  },
  electrode: {
    logLevel: "none"
  }
};
