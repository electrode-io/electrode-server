"use strict";

function register() {
  throw new Error("fail-plugin");
}

module.exports = {
  register,
  name: "fail-plugin"
};
