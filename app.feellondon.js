// Application for Nike/H&L Project Victory


// #Setup

// ##Module Dependencies.
var express = require('express');
var http = require('http');
var lessMiddleware = require('less-middleware');
var path = require('path');
var fs = require('fs');
var argv = require('optimist').argv;
// ##Custom Modules
var jadeMiddleware = require(path.join(__dirname, 'libs/jade-middleware.js'));
var liveReload = require(path.join(__dirname, 'libs/live-reload.js'));
var WebSocketRepeater = require(path.join(__dirname, 'libs/ws-repeater.js'));
var TwitterAtClient = new require(path.join(__dirname, 'libs/twitter-at-client.js'));
var RedisSetStorage = require(path.join(__dirname, 'libs/redis-set-storage.js'));
var RedisTimeseriesStorage = require(path.join(__dirname, 'libs/redis-timeseries-storage.js'));
var TwitterMiddleware = require(path.join(__dirname, 'libs/middleware.js'));
var Router = require(path.join(__dirname, 'libs/router.js'));

// #DB / Redis

var redis = require("redis");
var redisClient = redis.createClient();
// Use data base 3
redisClient.select(3);

// Container for bad words
var badWordsStorage = new RedisSetStorage({
    redisClient: redisClient,
    key: "badwords"
});

// Container for banned usernames
var bannedUsersStorage = new RedisSetStorage({
    redisClient: redisClient,
    key: "badusers"
});

var hashTagTimeseriesStorage = new RedisTimeseriesStorage({
    redisClient: redisClient,
    key: "h"
});

// ##Utils

// Returns the set of bad updating it 
// periodically to save query the bad words 
// every tweet
var getBadWords = (function () {
    var badWords = [];
    var lastUpdated = 0;
    var updateEveryMS = 3000;
    return function (callback) {
        if (Date.now() - lastUpdated > updateEveryMS) {
            badWordsStorage.getItems(function (err, items) {
                badWords = items;
                callback(badWords);
            });
        } else {
            callback(badWords);
        }
    };
}());

// #HTML Server

// ##Options
var serveFromDirectory = path.resolve( argv.d || argv.dirname || path.join(__dirname, 'public/') );
var shouldWatchFiles = process.env.LIVE_RELOAD || argv.l || argv.livereload; 
// legacy
shouldWatchFiles = shouldWatchFiles || process.env.WATCH || argv.w || argv.watch; 

var app = express();
app.configure(function(){
    app.set('port', process.env.PORT || argv.p || 3000);
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    var jadeOptions = {
        pretty: true,
        basedir: serveFromDirectory
    };
    var jadeLayoutFile = path.join(serveFromDirectory, 'layout.jade');
    if ( fs.existsSync( jadeLayoutFile ) ) {
        jadeOptions.filename = jadeLayoutFile;
    }
    app.use(jadeMiddleware({
        src: serveFromDirectory,
        jadeOptions: jadeOptions
    }));
    app.use(lessMiddleware({
        src: serveFromDirectory
    }));
    app.use(express.static(serveFromDirectory));
    app.use(app.router);
    app.use(express.directory(serveFromDirectory));
});

var server = http.createServer(app);

// ###Routing

// ####Bad words list
app.get('/api/bad-words/', badWordsStorage.middleware.get);
app.post('/api/bad-words/', badWordsStorage.middleware.add);
app.delete('/api/bad-words/', badWordsStorage.middleware.delete);

// ####Banned users list
app.get('/api/banned-users/', bannedUsersStorage.middleware.get);
app.post('/api/banned-users/', bannedUsersStorage.middleware.add);
app.delete('/api/banned-users/', bannedUsersStorage.middleware.delete);

// ####Hashtag counter
app.get('/hashtags/:tag/', getHashTagRequestHander(RedisTimeseriesStorage.RES_MINUTE));
app.get('/hashtags/:tag/minute/', getHashTagRequestHander(RedisTimeseriesStorage.RES_MINUTE));
app.get('/hashtags/:tag/hour/', getHashTagRequestHander(RedisTimeseriesStorage.RES_HOUR));
app.get('/hashtags/:tag/day/', getHashTagRequestHander(RedisTimeseriesStorage.RES_DAY));
app.get('/hashtags/:tag/week/', getHashTagRequestHander(RedisTimeseriesStorage.RES_WEEK));

function getHashTagRequestHander(resolution) {
    return function (req, res) {
        hashTagTimeseriesStorage.count(req.params.tag, resolution, function (err, results) {
            if (err) { res.json(500, err); return; }
            res.json(results);
        });
    };
}

// #Web Socket Server

// Create the web socket server
var websocketServer = new WebSocketRepeater({
    server: server
});

// #Twitter Flow

var twitterMiddleware = new TwitterMiddleware();

// ##Logout the tweet

/*
twitterMiddleware.add(function (tweet, next) {
    console.log(tweet);
    next();
});
*/

// ##Check for banned users

twitterMiddleware.add(function (tweet, next) {
    bannedUsersStorage.hasItem(tweet.userScreenName, function (err, result) {
        if (err) {
            console.log("Error: error checking if twitter user exits", err);
            return;
        }
        if (result === 1) {
            console.log("Banned user tweeting", tweet);
        } else {
            next();
        }
    });
});

// ##Count hash tags

twitterMiddleware.add(function (tweet, next) {
    tweet.hashTags.forEach(function (hashTag) {
        hashTagTimeseriesStorage.increment(hashTag.text);
    });
    next();
});

// ##Check for commands

twitterMiddleware.add(function (tweet, next) {
    next();
});

// ##Check for shout out

/*
twitterMiddleware.add(function (tweet, next) {
    var i = 0;
    var hasShoutout = false;
    while (i < tweet.hashTags.length && !hasShoutout) {
        if (tweet.hashTags[i].text === "shoutout") {
            hasShoutout = true;
        }
        ++i;
    }
    if (hasShoutout) {
        next();
    }
});
*/

// ##Check for bad words

twitterMiddleware.add(function (tweet, next) {
    getBadWords(function (badWords) {
        var i = 0;
        var hasBadWord = false;

        while (i < badWords.length && !hasBadWord) { 
            if (tweet.text.indexOf(badWords[i]) > -1) {
                hasBadWord = true;
            }
            ++i;
        }
        if (!hasBadWord) {
            next();
        }
    });
});

// ##Store tweet

twitterMiddleware.add(function (tweet, next) {
    storeTweet(tweet, function (err, result) {
        if (err) { 
            console.log('Problem storing tweet'); 
            return;
        }
        next();
    });
});

// ##Broadcast tweet

twitterMiddleware.add(function (tweet, next) {
    sendModerationTweet('initial', tweet);
});

// #Websocket listener / router
// Perhaps this should be moved to a seperate client

var wsRouter = new Router();

wsRouter
    .map('/moderation/initial/approved/:tweetId/').to(function (params) {
        retrieveTweetWithId(params.tweetId, function (err, tweet) {
            sendModerationTweet('legal', tweet);
        });
    })
    .map('/moderation/legal/approved/:tweetId/').to(function (params) {
        retrieveTweetWithId(params.tweetId, function (err, tweet) {
            if (err) {
                console.log("Could not retrieve tweet with retrieveTweetWithId for id", params.tweetId);
            }
           sendShoutout(tweet);
        });
    });

websocketServer.on('message', function (message, ws) {
    var json;
    try {
        json = JSON.parse(message);
    } catch (err) {
        return;
    }
    if (json.resource && typeof json.resource === "string") {
        wsRouter.trigger(json.resource, json.body);
    }
});

// #Utils

function storeTweet(tweet, callback) {
    var str;
    try {
        str = JSON.stringify(tweet);
    } catch(e) {
        console.log('Error jsonifying tweet', tweet);
        return;
    }
    // Store in redis
    var multi = redisClient.multi();
    var key = 'tweets:'+tweet.id;
    multi.set(key, str);
    multi.expire(key, 60*60*24*7*7); // 7 weeks
    multi.exec(callback);
}

function retrieveTweetWithId(id, callback) {
    redisClient.get('tweets:'+id, function (err, tweetAsString) {
        if (err) {
            callback(err);
            return;
        }
        // Try JSON it
        var tweet;
        try {
            tweet = JSON.parse(tweetAsString);
        } catch (e) {
            callback(e);
            return;
        }
        callback(null, tweet);
    });
}

// ##Broadcast messages

function sendModerationTweet(level, tweet) {
    var moderationMessage = {
        resource : "/moderation/"+level+"/new/",
        method : "post",
        body : tweet
    };
    try {
        str = JSON.stringify(moderationMessage);
    } catch (e) {
        console.log('Error jsonifying moderation message', moderationMessage);
        return;
    } 
    websocketServer.send(str);
}

function sendShoutout(tweet) {
    var moderationMessage = {
        resource : "/shoutout/new/",
        body : tweet
    };
    try {
        str = JSON.stringify(moderationMessage);
    } catch (e) {
        console.log('Error jsonifying moderation message', moderationMessage);
        return;
    } 
    websocketServer.send(str);
}

// #Twitter Stream Connect

var twitterAtClient = new TwitterAtClient();
twitterAtClient.on('tweet', twitterMiddleware.route );

// #Live Reloading
// To watch `WATCH=1 node app.js`
if (shouldWatchFiles) {
    liveReload.watch({
        pathPatterns: [serveFromDirectory+"/**/*"],
        server: server,
        app: app
    });
}
server.listen(app.get('port'), function() {
    console.log( lcyan("Servant", "serving")+ ":" );
    console.log( bold("\n   " + serveFromDirectory) );
    console.log("\nfrom port:",  green(app.get('port')) );
    if (shouldWatchFiles) {  console.log( "whilst watching for file changes.\nadd", lcyan("`/watch.js`"), " to your html for live reloading." ); }
});


// Bit of color
function green() { return "\033[1;32m" +  [].slice.apply(arguments).join(' ') + "\033[0m"; }
function green() { return "\033[1;32m" +  [].slice.apply(arguments).join(' ') + "\033[0m"; }
function lcyan() { return "\033[1;36m" + [].slice.apply(arguments).join(' ') + "\033[0m"; }
function bold() { return "\033[1m" + [].slice.apply(arguments).join(' ') + "\033[0m"; }