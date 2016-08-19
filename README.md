# Electrode Server

This is an imaginatively named, configurable web server using Hapi.js atop Node.js.

The aim is to provide a standardized node web server that can be used to serve your web
application without the need for duplicating from another example, or starting from scratch.

The intention is that you will extend via configuration, such that this provides the baseline
functionality of a Hapi web server, and within your own application you will add on the
features, logic, etc unique to your situation.

This module requires Node v4.2.x+.

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

For example, if you want to spin up a server with HTTP compression off:

```js
const config = {
    connections: {
        default: {
            compression: false
        }
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

   * Server options to pass to [Hapi's `Hapi.Server`]

   * _default_

    ```js    
    {
      server: {
        app: {
          electrode: true
        }
      }
    }
    ```


### `connections` (Object) 

   * Connections to setup for the Hapi server.  Each connection should be an object field and its key is used as the labels of the connection.

   * _default_

    ```js
    {
        default: {
          host: process.env.HOST,
          address: process.env.HOST_IP || "0.0.0.0",
          port: parseInt(process.env.PORT, 10) || 3000,
          routes: {
            cors: true
          }
        }
    }
    ```

### `plugins` (Object) 

   * plugin registration objects, converted to an array of its values and passed to [Hapi's `server.register`]

   * _default_

    ```js
    {
      plugins: {
        appConfig: {
          enable: true,
          module: `${__dirname}/../plugins/app-config.js`,
          options: {}
        },
        inert: {
          enable: false
        },
        staticPaths: {
          enable: false,
          module: `${__dirname}/../plugins/static-paths.js`,
          options: {
            pathPrefix: "",
            config: {}
          }
        }
      }
    }
    ```

    > `inert` is using [Hapi inert plugin] to handle static files.
    
### `listener` (function) 

   * A function to install event listeners for the electrode server startup lifecycle.

   * The following events are supported:

       * `config-composed`    - All configurations have been composed into a single one
       * `server-created`     - Hapi server created
       * `connection-set`     - Connection set with `server.connection`
       * `plugins-sorted`     - Plugins processed and sorted by priority
       * `plugins-registered` - Plugins registered with Hapi
       * `server-started`     - Server started
       * `complete`           - Final step before returning

To receive events you must provide an optional listener at construction time to electrodeServer. 
This can be included on the original configuration object. The data object will
contain handles to: `emitter`, `server`, `config`, and `plugins`. Depending on the stage
some data may not be present. For example, `server` is not available until `server-created` event
and `plugins` is not available until `plugins-sorted` event.

> These are async events so you have to take a `next` callback parameter and call it at the end of your handler. 

```js
myConfig.listener = (emitter) => {
  emitter.on("server-created", (data, next) => {
    // do something
    next();
  });
});
```

## Default plugins

`electrode-server` registers a few plugins by default.

These two are `electrode-server's` internal plugins:

   * `appConfig` sets `req.app.config` to `server.app.config` as soon as a request comes in.  That's why its priority is low.
   * `staticPaths` is a simple plugin that serves static files from `${pathPrefix}/js`, `${pathPrefix}/images`, and `${pathPrefix}/html`.

If you want to turn on/off one of these default plugins, you can set its `enable` flag to false.  For example, to turn off
the `appConfig` plugin, in your config, do:

```js
{
  plugins: {
    appConfig: {
      enable: false
    }
  }
}
```

> Please refer to the code for [latest default plugins](lib/config/default.js#L39).

## electrode-confippet

To keep your environment specific configurations manageable, you can use [electrode-confippet].

Once you have your config files setup according to the [configuration files setup], you can simply pass the config object to electrode server.

```js
const config = require("electrode-confippet").config;

require("electrode-server")(config);
```

## Adding a Hapi plugin

You can have `electrode-server` register any Hapi plugin that you want
through your configuration file. Here's an example using the `crumb` plugin:

First, install the plugin as you normally would from `npm`:

`npm i --save crumb`

Then, add your plugin to the config `plugins` section.

```js
{
  plugins: {
    crumb: {
      enable: true,
      options: {},
      priority: 210,
      register: function (...) {},
      module: "crumb"
    }
  }
}
```

Above config tells `electrode-server` to use the plugin's field name `crumb` as the name of
the plugin's module to load for registration with Hapi.

### Plugin configs

   * plugin field name - generally use as the name of the plugin module to load for registration
   * `enable` - if set to `false` then this plugin won't be registered.  If it's not set then it's considered to be `true`.
   * `options` - Object that's passed to the plugin's register function.
   * `priority` - integer value to indicate the plugin's registration order
      * Lower value ones are register first
      * Default to `Infinity` if this field is missing or has no valid integer value (`NaN`) (string of number accepted)
   * `register` and `module` - mutually exclusive fields to allow you to specify the register function or the name of the module for the plugin.  See more details under [Other plugin configs](#otherpluginconfigs).

#### About Priority

  * Priority works in a way to allow you to arrange plugins to be registered in an order you prefer.
  * Unless you have a reason to, please avoid specifying priority.  If you do, unless you have a reason otherwise, please use >= 200.

> A note about priority: If you are wondering what value to set for priority, the most likely answer is you **should not** set it.

### Other plugin configs

If a plugin's field name is not desired as its module name, then you can optionally specify one of the following
to provide the plugin's module for registration:

   * `register` - if specified, then treat as the plugin's `register` function to pass to Hapi
   * `module` - if specified and `register` is not, then treat it as the name of the plugin module to load for registration.
      * If you absolutely do not want electrode server to try loading any module for this plugin, then set `module` to false.

## API

The electrode server exports a single API.

### [electrodeServer](#electrodeserver)

`electrodeServer(config, [decors], [callback])`

   * `config` is the [electrode server config](#configuration-options)
   * `callback` is an optional errback with the signature `function (err, server)`
      * where `server` is the Hapi server
   * `decors` - Optional extra `config` or array of `config`.  In case you have common config you want to put inside a dedicated module, you can pass them in here.
      * If it's an array like `[ decor1, decor2, decor3 ]` then they are composed from left to right.  Rightmost will be the final value when there's overlapping.
      * The final decor is then composed into electrode-server's defaults before applying `config`.
   * Returns a promise resolving to the Hapi server if callback is not provided

## License

[electrode-confippet]: https://www.npmjs.com/package/electrode-confippet
[Hapi crumb plugin]: https://github.com/hapijs/crumb
[Hapi's `Hapi.Server`]: http://hapijs.com/api#new-serveroptions
[Hapi's `server.register`]: http://hapijs.com/api#serverregisterplugins-options-callback
[Hapi inert plugin]: https://github.com/hapijs/inert
[configuration files setup]: https://www.npmjs.com/package/electrode-confippet#configuration-files
[Hapi inert plugin]: https://github.com/hapijs/inert
