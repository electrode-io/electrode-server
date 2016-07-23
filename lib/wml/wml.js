"use strict";
const _ = require("lodash");
const DEFAULT_REFRESH_INTERVAL = 300; // default CCM/service refresh interval in seconds
const HTTP_OK = 200;
const Promise = require("bluebird");

let server;

const invokeRefresher = (refreshPath, tag) => {
  return new Promise((resolve, reject) => {
    const defaultServer = server.select("default");
    const conn = _.first(defaultServer.connections);
    //
    // not using server.info.uri because that could be using a different hostname
    // but we really just want to access through localhost
    //
    const url = `${conn.info.protocol}://localhost:${conn.info.port}${refreshPath}`;
    conn.inject(
      {
        method: "GET",
        url
      },
      (res) => {
        return res.statusCode === HTTP_OK ?
          resolve() : reject(new Error(`${url} returned status ${res.statusCode}`));
      }
    );
  })
    .catch((err) => {
      console.log(`Electrode Server - ${tag} refresh returned error:`, err); // eslint-disable-line
    });
};

const repeatRefresh = (refreshPath, tag, interval) => {
  const invoke = () => invokeRefresher(refreshPath, tag);

  interval = interval > 0 ? interval : DEFAULT_REFRESH_INTERVAL;
  const repeater = setInterval(invoke, interval * 1000); // eslint-disable-line

  server.app.refreshers[tag] = {interval, repeater};

  return invoke();
};

const invokeInitializerRefresh = (config) => {
  const refreshPath = config.services.registryRefreshPath;

  if (config.services.autoDiscovery !== false && refreshPath) {
    return invokeRefresher(refreshPath, "service");
  }
};

const invokeCcmRefresh = (config) => {
  const refreshPath = config.ccm.ccmRefreshPath;
  if (config.ccm.autoLoad && refreshPath) {
    return repeatRefresh(refreshPath, "ccm", config.ccm.interval);
  }
};

module.exports = function (data) {
  server = data.server;

  server.app.refreshers = {};

  server.ext("onPreStop", (s, next) => {
    _.each(s.app.refreshers, (ref) => {
      clearInterval(ref.repeater);
    });
    next();
  });

  return Promise.try(() => invokeInitializerRefresh(data.config))
    .then(() => invokeCcmRefresh(data.config));
};
