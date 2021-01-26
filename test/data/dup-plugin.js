function nulPlugin() {}

module.exports = {
  pageTitle: "test 1",
  plugins: {
    plugin1: {
      register: nulPlugin,
      pkg: {
        name: "nulPlugin"
      }
    },
    plugin2: {
      register: nulPlugin,
      pkg: {
        name: "nulPlugin"
      }
    }
  },
  server: {
    app: {
      config: {
        test2: true
      }
    }
  },
  electrode: {
    logLevel: "none"
  }
};
