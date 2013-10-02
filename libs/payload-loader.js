var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

// # Events:
// * 'payloads updated' - <Array> payloads
// * 'command triggered' - <Object> payload, <Object> tweet

function PayloadLoader(options) {
    this.payloadDirectory = options.payloadDirectory;
    this.payloadsSorted = [];
}

util.inherits(PayloadLoader, EventEmitter);

PayloadLoader.prototype.loadPlayloads = function () {
    var self = this;
    var payloads = [];

    fs.readdir(this.payloadDirectory, function (err, files) {
        if (err) { 
            console.log( "Failed to load commands", err ); 
            return;
        }
        loop(files.length, function (i, next) {
            loadJson(path.join(self.payloadDirectory, files[i]), function (err, json) {
                if (err) {
                    console.log("Failed to load payload", err);
                    next();
                    return;
                }
                if (isValidPayload(json)) {
                    payloads.push(json);
                }
                next();
            });
        }, function () {
            // loaded all the json files
            
            // sort all the payloads based on the length of the
            // commands putting the longest commands first
            // so that `glitch longer` will trigger before `glitch`
            payloads.sort(function (a, b) {
                return b.command.length - a.command.length;
            });

            self.payloadsSorted = payloads;
            self.emit('payloads updated', self.payloadsSorted);
        });
    });
};

PayloadLoader.prototype.checkAndTriggerCommands = function (tweet, callback) {
    var self = this;
    var tweetText = tweet.text.toLowerCase();
    loop(this.payloadsSorted.length, function (i, next, end) {
        //console.log('here', tweetText, this.payloadsSorted[i].command);
        if (tweetText.indexOf(self.payloadsSorted[i].command) > -1) {
            self.emit( 'command triggered', self.payloadsSorted[i], tweet );
            end();
            return;
        } else {
            next();
            return;
        }
    }, callback);
};

// Utils

// Load json file
function loadJson(filename, callback) {
    fs.readFile(filename, 'utf8', function (err, data) {
        if (err) {
            callback(err);
            return;
        }
        var payload;
        try {
            payload = JSON.parse(data);
        } catch (e) {
            callback(e);
            return;
        }
        callback(null, payload);
    });
}

function loop (iterations, fn, callback) {
    var index = 0;
    var done = false;
    var end =  function() {
        done = true;
        callback();
    };
    var next = function() {
        if (done) { return; }
        if (index < iterations) {
            index++;
            fn(index-1, next, end);
        } else {
            done = true;
            if (callback) { callback(); }
        }
    };
    next();
    return next;
}

function isValidPayload(json) {
    if (typeof json !== "object") {
        return false;
    }
    if (typeof json.command !== 'string') {
        return false;
    }
    return true;
}

module.exports = PayloadLoader;