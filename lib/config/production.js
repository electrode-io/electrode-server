"use strict";

module.exports = {
  logging: {
    logMode: "production",
    serializers: {
      verbose: true
    },
    transports: [
      {
        type: "stdout"
      },
      {
        type: "splunk",
        path: "/log/splunk/splunk.log",
        default: true
      },
      {
        type: "apm",
        path: "/log/apm/apm.log"
      },
      {
        type: "beacon",
        path: "/log/beacon/beacon.log"
      },
      {
        type: "logmon",
        path: "/log/logmon/logmon.log"
      }
    ]
  }
};
