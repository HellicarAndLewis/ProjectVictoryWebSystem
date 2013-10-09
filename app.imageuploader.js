var config = {
    s3 : {
        key: process.env.S3_KEY || argv.k, 
        secret: process.env.S3_SECRET || argv.s, 
        bucket: process.env.S3_BUCKET || argv.b
    },
    watchDirectory : process.env.WATCH_DIRECTORY || argv.d,
    serverPing : {
        host:  process.env.PING_HOST || argv.h,
        port: process.env.PING_PORT || argv.p
    }   
 };


// #Modules
var chokidar = require('chokidar');
var nStore = require('nstore');
var knox = require('knox');
var path = require('path');
var argv = require('optimist').argv;
var http = require('http');

// #S3

var s3client = knox.createClient(config.s3);    

// #Folder watching

// /^(?:(?!.*\.jpg).)*$/m



var watcher = chokidar.watch(process.env.WATCH_DIRECTORY || argv.d, { ignored: /^\./, persistent: true });
 
function startWatching () {
    watcher.on('add', function (filepath, stat) {
        var filename = path.basename(filepath);

        if (!hasValidFilename(filename)) { return; }
        ifNotSavedAlready(filename, function () {
            console.log("Need to save:", filename);
            saveFile(filename, function(err) {
                if (err) {
                    console.log(err);
                    return;
                }
                // save to nstore
                console.log("Saving to nstore key", filename);
                uploadsStore.save('feeltv/'+filename, {},  function (err) {
                    if (err) {
                        console.log("failed to save to nstore", filename, err);
                        return;
                    }
                    pingServerOfNewImage(filename);
                });
            });
        });
    });
}

// #Connect to the sudo db

// ##Create a store
var uploadsStore = nStore.new('uploads.db', startWatching);

// #Utils

function hasValidFilename(filename) {
   return filename.match(/\.(?:bmp|gif|jpe?g|png)$/m);
}

function parseFilename(filename) {
    return {
        filename : "filename",
        twitterId : 10001,
        timestamp : 10002
    };
}

function ifNotSavedAlready(filename, callback) {
    uploadsStore.get(filename, function (err, doc, key) {
        if (err) { callback(); }
    });
}

function saveFile(filename, callback) {
    s3client.putFile(path.join(config.watchDirectory, filename), 'feeltv/'+filename, { 'x-amz-acl': 'public-read', 'x-amz-storage-class': 'REDUCED_REDUNDANCY' }, function (err, res) {
        if (err) { callback(err); return; }
        if (res.statusCode != 200) { callback(res); return; }
        callback(null);
    });
}

function pingServerOfNewImage(filename) {
    var tweetId = path.basename(filename, '.jpg');
    var requestOptions = {};
    requestOptions.host = config.serverPing.host;
    requestOptions.port = config.serverPing.port;
    requestOptions.path = "/api/imageuploaded/" + tweetId + "/";
    http
        .get(requestOptions, function(res) {})
        .on("error", function(e){
            console.log("pingServerOfNewImage : Got error: " + e.message);
        });
}

// #Command line

// ##List all files stored
if (argv.l) {
    s3client.list({  }, function(err, data) {
        if (err) {
            console.log("list error", err);
        }
        console.log(data);
    });
}

// ##Delete files
if (argv.d) {
    s3client.del(argv.d).on('response', function(res){
        console.log("delete status", res.statusCode);
        console.log("delete headers", res.headers);
    }).end();
}