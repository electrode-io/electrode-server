"use strict";

const DNS = require("dns");
const OS = require("os");
const Path = require("path");
const dnscache = require("./dnscache");
const wml = require("./wml");
const Confippet = require("@walmart/electrode-confippet");

const lookupHostIP = (serverConfig) => {
  const hostname = serverConfig.electrode.hostname || OS.hostname();

  const ip4 = 4;
  return new Promise((resolve, reject) =>
    DNS.lookup(hostname, ip4, (err, address) => {
      return err ? reject(err) : resolve(address);
    })
  )
    .then((address) => {
      serverConfig.electrode.hostname = hostname;
      serverConfig.electrode.hostIP = address;
    })
    .catch(() => 0); // if can't resolve host IP from hostname, then just forget it.
};

function wmlDecors() {
  const configOptions = {
    dirs: [Path.join(__dirname, "config")],
    warnMissing: false,
    context: {
      deployment: process.env.NODE_ENV
    }
  };

  const wmlDefaults = Confippet.store();
  wmlDefaults._$.compose(configOptions);
  wmlDefaults.listener = (emitter) => {
    emitter.on("config-composed", (data, next) => {
      lookupHostIP(data.config);
      next();
    });
    emitter.on("server-created", (data, next) => {
      dnscache(data.config.dnscache);
      next();
    });
    emitter.on("server-started", (data, next) => {
      wml(data).then(() => next());
    });
  };

  return wmlDefaults;
}

module.exports = wmlDecors;
