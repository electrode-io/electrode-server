#Electrode Server

This is an imaginatively named, configurable web server using Hapi.js atop Node.js.

The aim is to provide a standardized node web server that can be used to serve your web
application without the need for duplicating from another example, or starting from scratch.

The intention is that you will extend via configuration, such that this provides the baseline
functionality of a Hapi web server with React rendering, and within your own application you
will add on the features, logic, etc unique to your situation.

##Versioning

This module require Node v4.x+.

##Installing

`npm i --save @walmart/electrode-server`

##Usage

By convention, we house our server within a `server` directory, and our client code (React components, Flux stores,etc)
within a `client` directory. You are not required to do this for `electrode-server` to work, but that is what
we will do within this setup process.

First, create the `server` directory:

`mkdir server`

Then, create `server/index.js` with this content:

```js
require("@walmart/electrode-server");
```

Next, we use a configuration file to set up the server for our application.

In the root of your application, create a directory `config/electrode-server`:

`mkdir -p config/electrode-server`

(It is possible that you already have a `config` directory for other purposes, hence
the subdirectory for `electrode-server`)

Next, create the configuration file `config/electrode-server/server.js` with the following content:

```js
module.exports = {
  pageTitle: "My Application Name",
  devServer: {
    port: "2992"
  },
  plugins: {
    registerRoutes: {
      options: {
        "/": {
          view: "index",
          content: null
        }
      }
    }
  },
  server: {
    app: {
      config: require("./default.json")
    }
  }
};
```

Now, all that is necessary is for you to build out your client in `client`, and then you can
run `node server/index.js` to see it in action.

If you have not built your client-side content yet and want to see `electrode-server` in action now,
check out [react/Getting Started](https://gecgithub01.walmart.com/react/) for an example.

##Configuration Options

Here's what you can configure via the config file, with default values noted inline.

`config/electrode-server/server.js` should export an object following the schema below. All properties
are optional (if not present, the default values shown below will be used).

_Note: You can write your configuration file using ES5 or ES6 syntax. That's a choice for you to make,
`electrode-server` can handle either. We encourage you to use ES6, of course._

* `pageTitle` (String) The value to be shown in the browser's title bar _default Untitled Awesome Web Application_
* `devServer` (Object) Options for webpack's DevServer
  - `host` (String) The host that webpack-dev-server runs on _default: 127.0.0.1_
  - `port` (String) The port that webpack-dev-server runs on _default: 2992_
* `server` (Object) Server options to pass to [Hapi's `Hapi.Server`](http://hapijs.com/api#new-serveroptions) _default: {}_
* `connections` (Object) Connections to setup for the Hapi server.  Each connection should be an object field and its key is used as the labels of the connection. 
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
* `plugins` (Object) plugin registration objects, converted to an array of its values and passed to [Hapi's server.register](http://hapijs.com/api#serverregisterplugins-options-callback)
   * The plugins will be sorted by a field `priority` with integer values
      * Default to `99999` if this field is missing or has no valid integer value (`NaN`) (string of number accepted)
   * A plugin is turned off ***if and only if*** a field `enable` is set to `false`
      * Default to `true` if this field is missing or any other value than `false`
   * _default_:
```js
plugins: {
  inert: {
    priority: 10,
    enable: true,
    register: Inert
  },
  staticPaths: {
    priority: 20,
    enable: true,
    register: StaticPaths
  },
  registerRoutes: {
    priority: 200,
    enable: true,
    register: RegisterRoutes
  }
}
```
* `serverSideRendering` (Boolean) Toggle server-side rendering. _default: true_
* `unbundledJS` (Object) Specify JavaScript files to be loaded at an available extension point in the index template
  - `enterHead` (Array) Array of script objects (`{ src: "path to file" }`) to be inserted as `<script>` tags in the document `head` before anything else _default: null_
  - `preBundle` (Array) Array of script objects (`{ src: "path to file" }`) to be inserted as `<script>` tags in the document `body` before the application's bundled JavaScript _default: null_
* `unbundledStyle` (Array) Array of paths to stylesheets not part of the application itself (such as a CDN hosted stylesheet for a library or similar) _default: null_

### Specifying routes for `registerRoutes` plugin

The `registerRoutes` routes can be specified in its `options` field.  They should key/value pairs specifying paths within your application with their view and (optionally) initial content for server-side render _default: { "/": {view: "index"}}_
  - _path_ (Object)
    - `view` (String) Name of the view to be used for this path **required**
    - `content` (String) Content to be rendered by the server when server-side rendering is used _optional_

ie:

```js
plugins: {
  registerRoutes: {
    options: {
      "/{args*}": {
        view: "index",
        content: (req) => {
          return engine(req);
        }
      }
    }
  }
}
```


##More advanced configuration

###Adding a plugin to be registered with Hapi via `server.register`

If you have a Hapi plugin that you want to use with `electrode-server` there is a simple way to do that within
your configuration file. Here's an example using the Store Info Plugin:

First, install the plugin as you normally would from `npm`:

`npm i --save @walmart/store-info-plugin`

`require` (ES5) or `import` (ES6) in to your configuration file:

**ES6**

`import StoreInfoPlugin from "@walmart/store-info-plugin";`

**ES5**

`var StoreInfoPlugin = require("@walmart/store-info-plugin");`

Add the plugin to the `plugins` property of the `electrode-server` configuration object:

```js
  plugins: {
    storeInfo: {
      priority: 210,
      register: StoreInfoPlugin 
    }
  }
```

If your plugin needs to be registered before other plugins, you can set `priority` to a lower value.

###Creating a new server-side route

This example steps through adding a path to be served from your application, with a theoretical API
endpoint - `/api/numbers`

Your endpoints and other functionality should be created as Hapi plugins. This embraces the Hapi methodology
and allows for logical modularization of your application.

First, create a `plugins` directory under `server`. Each logical grouping of paths (that will be server-side
rendered) should be their own plugin, so here we will create the `api` plugin:

`mkdir -p server/plugins/api`

Next, we'll create the main entry point for the `api` plugin, `server/plugins/api/index.js` and add this content:

**ES6**
```js
const Api = (server, options, next) => {

  server.route({
    path: "/api/numbers",
    method: "GET",
    handler: (request, reply) => {
      return reply({ numbers: [1,2,3,4,5] });
    }
  });

  next();

};

Api.attributes = {
  name: "exampleApi",
  version: "1.0.0"
};

export default Api;
```

**ES5**
```js
var Api = function (server, options, next) {

  server.route({
    path: "/api/numbers",
    method: "GET",
    handler: function (request, reply) {
      return reply({ numbers: [1,2,3,4,5] });
    }
  });

  next();

};

Api.attributes = {
  name: "exampleApi",
  version: "1.0.0"
};

module.exports = Api;
```

Finally, we add our new plugin to our configuration file - first requiring
or importing it:

**ES6**

`import Api from "../../server/plugins/api"; // path is relative to config/electrode-server/`

**ES5**

`var Api = require("../../server/plugins/api"); // path is relative to config/electrode-server/`

And add it to the plugins array:

```js
  plugins: [
    { register: Api }
  ]
```

##Support/Contact

Dave Stevens <dstevens@walmartlabs.com>

Slack: @dstevens

Also see Slack Channel `#react`
