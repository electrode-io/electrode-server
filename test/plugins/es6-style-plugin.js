function es6StylePlugin(server) {
  server.expose({});
}

module.exports.default = {
  register: es6StylePlugin,
  pkg: {
    name: "es6StylePlugin",
    version: "1.0.0"
  }
};
