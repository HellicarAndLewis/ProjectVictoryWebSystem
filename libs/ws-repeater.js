var WebSocketServer = require('ws').Server;
var _ = require("underscore");


/// # WebSocketRepeater
//
// Options:
//   * port <Number> only required if no server
//   * server <HttpServer>
//   * useHeartbeat <Boolean> 
function WebSocketRepeater (options) {
    var self = this;
    if (!options) { options = {}; }

    var port = options.port || 8080;
    var clientCount = 0;
    var idCounter = 0;

    this.clients = [];

    var wss;

    if (options.server) {
        wss = new WebSocketServer({server: options.server});
    } else {
        wss = new WebSocketServer({port: port});
    }

    // websocket connections
    wss.on('connection', function(ws) {
        var clientInfo = {
            ws: ws,
            cid: ++idCounter,
            errored: false
        };
        self.clients.push(clientInfo);
        clientCount++;

        ws.on('message', function(message) {
            var messageJSON;
            var responce;

            self.clients.forEach(function (client) {
                if (client.cid !== clientInfo.cid) {
                    client.ws.send(message);
                }
            });

            // try {
            //     messageJSON = JSON.parse(message);
            // } catch (e) {}

            // if (messageJSON) {
            //     testAllRoutes(routes, ws, messageJSON);
            // } 
        });

        ws.on('close', function() {
            self.clients = _.without(self.clients, clientInfo);
            --clientCount;
            logClientCount();
        });

        ws.on('error', function () {
            logClientCount();
            clientInfo.errored = true;
        });

        logClientCount();
    });

    // start the heat beat
    if (options.useHeartbeat) {
        this.heartbeat();
    }

    function logClientCount() {
        console.log("Client count ", clientCount);
    }

}

WebSocketRepeater.prototype.heartbeat = function () {
    var self = this;
    this.clients.forEach(function (clientInfo) {
        if (!clientInfo.errored) {
            clientInfo.ws.send('{"resource":"/heartbeat/1000/","body":{"count":"'+this.heartBeatCounter+'"}}');
            if (++self.heartBeatCounter > 100000) {
                self.heartBeatCounter = 0;
            }
        }
    });
    setTimeout(this.heartbeat, this.heartbeatSpeed);
};

module.exports = WebSocketRepeater;