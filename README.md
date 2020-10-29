# Electrode Server [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]

This is an imaginatively named, configurable web server using Hapi.js atop Node.js.

The aim is to provide a standardized node web server that can be used to serve your web
application without the need for duplicating from another example, or starting from scratch.

The intention is that you will extend via configuration, such that this provides the baseline
functionality of a Hapi web server, and within your own application you will add on the
features, logic, etc unique to your situation.

This module requires Node v8.x.x+.

# Table Of Contents

- [Installing](#installing)
- [Usage](#usage)
- [Configuration](#configuration)
- [Configuration Options](#configuration-options)
  - [`server` (Object)](#server-object)
  - [`connection` (Object)](#connection-object)
  - [`plugins` (Object)](#plugins-object)
  - [`listener` (function)](#listener-function)
  - [`http2` (Object)](#http2-object)
  - [logLevel](#loglevel)
- [electrode-confippet](#electrode-confippet)
- [Adding a Hapi plugin](#adding-a-hapi-plugin)
  - [Plugin configs](#plugin-configs)
    - [About Plugin Priority](#about-plugin-priority)
    - [More about register and module](#more-about-register-and-module)
    - [Exporting your Hapi Plugin from a module](#exporting-your-hapi-plugin-from-a-module)
    - [More about `requireFromPath`](#more-about-requirefrompath)
  - [Example: `crumb`](#example-crumb)
- [API](#api)
  - [electrodeServer](#electrodeserver)
- [Contributions](#contributions)
- [License](#license)

## Installing

`npm i --save electrode-server`

## Usage

Electrode Server comes with enough defaults such that you can spin up a Hapi server at `http://localhost:3000` with one call:

```js
require("electrode-server")();
```

Of course that doesn't do much but getting a `404` response from `http://localhost:3000`.
To handle your routes, you should create a Hapi plugin to install your handlers.
See below for configuration options on how to register your plugin through electrode-server.

## Configuration

You can pass in a config object that controls every aspect of the Hapi server.

For example, if you want to spin up a server with HTTP compression off at port 9000:

```js
const config = {
  connection: {
    port: 9000,
    compression: false
  }
};

require("electrode-server")(config);
```

However, for a more complex application, it's recommended that you use a config composer such as [electrode-confippet] to manage your app configuration.

## Configuration Options

Here's what you can configure:

All properties are optional (if not present, the default values shown below will be used).

`server.app.config` is set to a object that's the combination of your config with `electrode-server's` defaults applied.

### `server` (Object)

- Server options to pass to [Hapi's `Hapi.Server`]

**Default:**

```js
{
  server: {
    app: {
      electrode: true;
    }
  }
}
```

### `connection` (Object)

- Connection to setup for the Hapi server. Contains connection details for the server.
- If you want multiple connections, you can start multiple instances of `electrode-server`

**Default:**

```js
{
  connection: {
    host: process.env.HOST,
    address: process.env.HOST_IP || "0.0.0.0",
    port: parseInt(process.env.PORT, 10) || 3000,
    routes: {
      cors: true
    }
  }
}
```

`connections` Object in previous Electrode no longer supports multiple connections.
Only the `default` is allowed.

```js
      {
        connections: {
          default: {
            host: process.env.HOST,
            address: process.env.HOST_IP || "0.0.0.0",
            port: parseInt(process.env.PORT, 10) || 3000,
            routes: {
              cors: true
            }
          }
        }
      }
```

### `plugins` (Object)

- plugin registration objects, converted to an array of its values and passed to [Hapi's `server.register`]

Default is just empty object:

```js
{
  plugins: {
  }
}
```

### `listener` (function)

- A function to install event listeners for the electrode server startup lifecycle.

- The following events are supported:

  - `config-composed` - All configurations have been composed into a single one
  - `server-created` - Hapi server created
  - `plugins-sorted` - Plugins processed and sorted by priority
  - `plugins-registered` - Plugins registered with Hapi
  - `server-started` - Server started
  - `complete` - Final step before returning

To receive events you must set `config.listener` before calling `electrodeServer`.

For example:

```js
myConfig.listener = (emitter) => {
  emitter.on("server-created", (data, next) => {
    // do something
    next();
  });
});
```

- The data object will contain these: `emitter`, `server`, `config`, and `plugins`.

- Depending on the stage some may not be present. For example, `server` is not available until `server-created` event and `plugins` is not available until `plugins-sorted` event.

- These are async events so you have to take and call a `next` callback.

### `http2` (Object)

> Note: Requires version ^3.2.0 or ^2.4.0

To enable http2, set `http2.enable` to true. All options are passed to [`createSecureServer()`](https://nodejs.org/api/http2.html#http2_http2_createsecureserver_options_onrequesthandle).

```js
{
  "http2": {
    "enable": true,
    "key": Fs.readFileSync('./ssl/site.key'),
    "cert": Fs.readFileSync('./ssl/site.crt')
  }
}
```

### `keepAliveTimeout` (integer)

NodeJS defaults to 5 seconds keep-alive timeout. `electrode-server` defaults to 60 seconds timeout. If you want a custom timeout, use the `keepAliveTimeout` option (in milliseconds).

```json
{
  "electrode": {
    "keepAliveTimeout": 60000
  }
}
```

### logLevel

You can control how much output the Electrode Server logs to the console by setting the `logLevel`.

- Levels are `"info"`, `"warn"`, `"error"`, `"none"`.
- A level of `"warn"` means only warnning and error messages will be printed.
- **Default** is `"info"`

For example, to suppress the banner that is shown when the server starts up:

```
Hapi.js server running at http://mypc:4000
```

set the logLevel to "warn" or "error":

```js
{
  electrode: {
    logLevel: "warn";
  }
}
```

## electrode-confippet

To keep your environment specific configurations manageable, you can use [electrode-confippet].

Once you have your config files setup according to the [configuration files setup], you can simply pass the config object to electrode server.

```js
const config = require("electrode-confippet").config;

require("electrode-server")(config);
```

## Adding a Hapi plugin

You can have `electrode-server` register any Hapi plugin that you want
through your configuration file.

```js
{
  plugins: {
    "<plugin-id>": {
      enable: true,
      options: {},
      priority: 210,
      register: function () {}, // mutual exclusive with module
      module: "<plugin-module-name>",
      requireFromPath: process.cwd()
    }
  }
}
```

### Plugin configs

- `<plugin-id>` - ID for the plugin. Generally the module name for the plugin, which is used to load it for registration.
- `register` - _optional_ The register function to pass to Hapi. Overrides `module`.
- `module` - _optional_ name of the module to load for the plugin instead of the `<plugin-id>`
- `requireFromPath` - _optional_ The path from which to call `require` to load the plugin module
- `enable` - _optional_ if set to `false` then this plugin won't be registered. If it's not set then it's considered to be `true`.
- `options` - _optional_ Object that's passed to the plugin's register function.
- `priority` - _optional_ integer value to indicate the plugin's registration order
  - Lower value ones are register first
  - Default to `Infinity` if this field is missing or has no valid integer value (`NaN`) (string of number accepted)

#### About Plugin Priority

Priority allows you to arrange plugins to be registered in an order you prefer. The plugins with lower priority values are registered first.

#### More about register and module

If you don't want to use `<plugin-id>` to load the module, then you can optionally specify one of the following:

- `register` - if specified, then treat as the plugin's `register` function to pass to Hapi, **_overides module_**
- `module` - Only used if `register` is not specified
  - If it's a string the used as the name module to `require` for registration.
  - It it's `false` then electrode server will not load any module.
  - You can specify a [require-from-path] for the module using an object.

```js
        {
          plugins: {
            myPlugin: {
              module: {
                requireFromPath: process.cwd(),
                name: "my-plugin-module"
              }
            }
          }
        }
```

#### Exporting your Hapi Plugin from a module

Electrode server will try to find your Hapi Plugin from your module by looking through these fields:

1. `mod.hapiPlugin`
2. `mod.default.hapiPlugin`
3. `mod.default`
4. `mod` itself

Examples:

1. Exporting the plugin directly as the module:

CommonJS example:

```js
module.exports = myHapiPlugin;
```

ES6 example:

```js
export default myHapiPlugin;
```

2. Exporting the plugin as a field named `hapiPlugin`:

CommonJS example:

```js
module.exports.hapiPlugin = myHapiPlugin;
```

ES6 example:

```js
const hapiPlugin = myHapiPlugin;
export hapiPlugin;
```

ES6 default:

```js
export default {
  hapiPlugin: myHapiPlugin
};
```

#### More about `requireFromPath`

There are three places you can specify a path to call `require` from when loading your plugin modules.

1. `config.plugins.requireFromPath` - The top one used for all plugins
1. `config.plugins.<plugin-id>.requireFromPath` - Used for the specific plugin of `<plugin-id>`, **overrides the one above**
1. `config.plugins.<plugin-id>.module.requireFromPath` - Used for the specific plugin of `<plugin-id>`, **overrides the two above**

For more information: check out [require-from-path]

### Example: `crumb`

**Here's an example using the `crumb` plugin:**

First, install the plugin as you normally would from `npm`:

`npm i --save crumb`

Then, add your plugin to the config `plugins` section.

```js
{
  plugins: {
    "crumb": {
      enable: true,
      options: {},
      priority: 210,
      requireFromPath: process.cwd()
    }
  }
}
```

Above config tells `electrode-server` to `require` from `CWD` the module by its `<plugin-id>` `"crumb"` and register it as a plugin with Hapi.

## API

The electrode server exports a single API.

### [electrodeServer](#electrodeserver)

`electrodeServer(config, [decors], [callback])`

- `config` is the [electrode server config](#configuration-options)
- `decors` - Optional extra `config` or array of `config`. In case you have common config you want to put inside a dedicated module, you can pass them in here.

  - If it's an array like `[ decor1, decor2, decor3 ]` then each one is composed into the main config. ie: something similar to `_.merge(mainConfig, decor1, decor2, decor3)`.

- `callback` is an optional errback with the signature `function (err, server)`

  - where `server` is the Hapi server

- **Returns:** a promise resolving to the Hapi server if callback is not provided

## Contributions

Make sure you sign the CLA. Checkout the [contribution guide](https://github.com/electrode-io/electrode/blob/master/CONTRIBUTING.md)

To run tests

```sh
% npm i
% clap test
```

To run tests and coverage

```sh
% clap check
```

To run sample server

```sh
% npm run sample
```

Hit `http://localhost:9000`

### Publishing

- Require access to npmjs.org to publish this package.
- Run `npm version` to update the version. Commit with tags
- Run `npm publish` to publish
- Update CHANGELOG.md

## License

Copyright 2016-present WalmartLabs

Licensed under the [Apache License, Version 2.0].

[electrode-confippet]: https://www.npmjs.com/package/electrode-confippet
[hapi crumb plugin]: https://github.com/hapijs/crumb
[hapi's `hapi.server`]: http://hapijs.com/api#new-serveroptions
[hapi's `server.register`]: http://hapijs.com/api#serverregisterplugins-options-callback
[configuration files setup]: https://www.npmjs.com/package/electrode-confippet#configuration-files
[npm-image]: https://badge.fury.io/js/electrode-server.svg
[npm-url]: https://npmjs.org/package/electrode-server
[travis-image]: https://travis-ci.org/electrode-io/electrode-server.svg?branch=master
[travis-url]: https://travis-ci.org/electrode-io/electrode-server
[daviddm-image]: https://david-dm.org/electrode-io/electrode-server.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/electrode-io/electrode-server
[require-from-path]: https://www.npmjs.com/package/require-from-path
[apache license, version 2.0]: https://www.apache.org/licenses/LICENSE-2.0
