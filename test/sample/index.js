"use strict";

const eventReceived = [];
const config = {
  connection: {
    port: 9000
  },
  plugins: {
    default: {
      pkg: {
        name: "Plugin"
      },
      register: server => {
        server.route([
          {
            method: "GET",
            path: "/",
            handler: () => {
              const listEvents = eventReceived.join(", ");
              return `Received Events: [${listEvents}]`;
            }
          }
        ]);
      }
    }
  },
  listener: emitter => {
    emitter.on("server-created", () => {
      eventReceived.push("server-created");
    });
    emitter.on("config-composed", () => {
      eventReceived.push("config-composed");
    });
    emitter.on("plugins-sorted ", () => {
      eventReceived.push("plugins-sorted ");
    });
    emitter.on("plugins-registered", () => {
      eventReceived.push("plugins-registered");
    });
    emitter.on("server-started", () => {
      eventReceived.push("server-started");
    });
    emitter.on("complete", () => {
      eventReceived.push("complete");
    });
  }
};
require("../../")(config);
