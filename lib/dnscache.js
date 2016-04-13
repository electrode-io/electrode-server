"use strict";

const _ = require("lodash");
const dnscache = require("dnscache");

module.exports = function (options) {
  dnscache(_.merge({
    enable: true,
    ttl: 600,
    cachesize: 500
  }, options));
};
