"use strict";

function register(server, options, next) {
  next("fail-plugin");
}

register.attributes = {
  name: "fail-plugin"
};

module.exports = register;
