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
var corsMiddleware = require(path.join(__dirname, 'libs/cors-middleware.js'));
var liveReload = require(path.join(__dirname, 'libs/live-reload.js'));
var WebSocketRepeater = require(path.join(__dirname, 'libs/ws-repeater.js'));
var TwitterAtClient = new require(path.join(__dirname, 'libs/twitter-at-client.js'));
var RedisSetStorage = require(path.join(__dirname, 'libs/redis-set-storage.js'));
var RedisTimeseriesStorage = require(path.join(__dirname, 'libs/redis-timeseries-storage.js'));
var TwitterMiddleware = require(path.join(__dirname, 'libs/middleware.js'));
var Router = require(path.join(__dirname, 'libs/router.js'));
var MockTweetList = require(path.join(__dirname, 'libs/mock-tweet-list.js'));
var PayloadLoader = require(path.join(__dirname, 'libs/payload-loader.js'));

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

// Dev Tweets lists
var mockTweetList = new MockTweetList({
    redisClient: redisClient
});

// Load the payloads
var payloadLoader = new PayloadLoader({
    payloadDirectory : path.join(__dirname, 'data/payloads/')
});
// Log out how many payloads get loaded
payloadLoader.on('payloads updated', function (payloads) {
    console.log("Loaded", payloads.length, "payloads");
});
// Load them
payloadLoader.loadPlayloads();
// Listen for any triggers
payloadLoader.on('command triggered', function (payload, tweet) {
    console.log('triggering payload', payload);
    sendCommand(payload, tweet);
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

// ####Cors support
app.all('*', corsMiddleware);

// ####Bad words list
app.get('/api/bad-words/', badWordsStorage.middleware.get);
app.post('/api/bad-words/', badWordsStorage.middleware.add);
app.delete('/api/bad-words/', badWordsStorage.middleware.delete);

// ####Banned users list
app.get('/api/banned-users/', bannedUsersStorage.middleware.get);
app.post('/api/banned-users/', bannedUsersStorage.middleware.add);
app.delete('/api/banned-users/', bannedUsersStorage.middleware.delete);

// ####Last shoutouts
app.get('/api/lastshoutouts/', function (req, res) {
    res.json( lastShoutouts );
});

// ####Hashtag counter
app.get('/hashtags/:tag/', getHashTagRequestHander(RedisTimeseriesStorage.RES_MINUTE));
app.get('/hashtags/:tag/minute/', getHashTagRequestHander(RedisTimeseriesStorage.RES_MINUTE));
app.get('/hashtags/:tag/hour/', getHashTagRequestHander(RedisTimeseriesStorage.RES_HOUR));
app.get('/hashtags/:tag/day/', getHashTagRequestHander(RedisTimeseriesStorage.RES_DAY));
app.get('/hashtags/:tag/week/', getHashTagRequestHander(RedisTimeseriesStorage.RES_WEEK));

// ####Reload the payloads
app.get('/api/reload-payloads/', function (req, res) {
    payloadLoader.loadPlayloads(function (err, payloads) {
        if (err) {
            res.json(500, err);
            return;
        }
        res.json(payloads);
    });
});

// ####Tweet back images uploaded
app.get('/api/imageuploaded/:tweetId/', function (req, res) {
    makeImageReplyText(req.params.tweetId, function (err, text) {
        if (err) {
            console.log("makeImageReplyText handler error", err, "for tweet id", req.params.tweetId);
            res.json(500, err);
            return;
        } else {
            twitterAtClient.twitter.post('statuses/update', { 
                status: text,
                in_reply_to_status_id : req.params.tweetId
            }, function(err, reply) {
                if (err) {
                    console.log("twitter reply error", err);
                    res.json(500, err);
                    return;
                }
                console.log("Twitter reply send for ", req.params.tweetId);
                res.json(200, "ok");
            });
        }
    });
    
});

function makeImageReplyText(tweetId, callback) {
    retrieveTweetWithId(tweetId, function (err, tweet) {
        if (err) {
            callback("makeImageReplyText retrieveTweetWithId error");
            return;
        }
        var tweetText = "@"+tweet.userScreenName+" checkout the screen grab at http://www.1948london.com/feeltv/"+tweetId+"/";
        callback(null, tweetText);
    });
}

// ####Dev tweet list

// Returns the lastest dev tweets
app.get('/api/mock-tweet-list/', mockTweetList.middleware.get);
app.post('/api/mock-tweet-list/', mockTweetList.middleware.post);
app.delete('/api/mock-tweet-list/:tweetId/', mockTweetList.middleware.delete);
app.get('/api/mock-tweet-list/trigger/:tweetId/', mockTweetList.middleware.trigger);

// Store the last triggered tweets
var triggerTweets = [];
mockTweetList.on('triggered', function (tweet) {
    triggerTweets.push(tweet);
});

// Returns the last triggered tweets since last request
app.get('/api/mock-tweet-list/triggered/', function (req, res) {
    res.send(triggerTweets);
    triggerTweets = [];
});

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

twitterMiddleware.add(function (tweet, next) {
    console.log(tweet);
    next();
});

// ##Check the tweet as @ this twitter account

twitterMiddleware.add(function (tweet, next) {
    if (tweet.text.indexOf("@"+process.env.TWITTER_SCREENNAME) === 0 ) {
        next();
    }
});

// ##Check the tweet is not from this twitter account (e.g. retweets itself)
twitterMiddleware.add(function (tweet, next) {
    if (tweet.userScreenName !== process.env.TWITTER_SCREENNAME) {
        next();
    }
});

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
        hashTagTimeseriesStorage.increment( hashTag.text );
    });
    next();
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

// ##Check for commands

twitterMiddleware.add(function (tweet, next) {

    payloadLoader.checkAndTriggerCommands(tweet, next);

});

// ##Check for shout out

twitterMiddleware.add(function (tweet, next) {
    var i = 0;
    var hasShoutout = false;
    while (i < tweet.hashTags.length && !hasShoutout) {
        if (tweet.hashTags[i].text.toLowerCase() === "shoutout") {
            hasShoutout = true;
        }
        ++i;
    }
    if (hasShoutout) {
        next();
    }
});

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
            addToLastShoutouts(tweet);
            sendShoutout(tweet);
        });
    })
    .map('/hashtags/preformcount/:tag/:resolution/').to(function (params, body, token) {
        hashTagTimeseriesStorage.count(params.tag, params.resolution, function (err, result) {
            if (err) {
                console.log("Failed to get hash tag count via websockets for", params.tag, params.resolution, token);
                return;
            }
            sendHashTagCount(params.tag, params.resolution, result, token);
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
        wsRouter.trigger(json.resource, json.body, json.token);
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
        if (tweetAsString === null) {
            callback("could not find tweet with id");
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
        body : {
            tweet: tweet
        }
    };
    try {
        str = JSON.stringify(moderationMessage);
    } catch (e) {
        console.log('Error jsonifying moderation message', moderationMessage);
        return;
    } 
    websocketServer.send(str);
}

function sendCommand(payload, tweet) {
    var moderationMessage = {
        resource : "/command/new/",
        body : {
            tweet: tweet,
            payload : payload
        }
    };
    try {
        str = JSON.stringify(moderationMessage);
    } catch (e) {
        console.log('Error jsonifying moderation message', moderationMessage);
        return;
    } 
    websocketServer.send(str);
}

function sendHashTagCount(tag, resolution, result, token) {
    var countMessage = {
        resource : "/hashtags/count/new/",
        body : {
            tag: tag,
            resolution: resolution,
            result : result
        }
    };
    if (typeof token !== "undefined" || token !== null) {
        countMessage.token = token;
    }
    try {
        str = JSON.stringify(countMessage);
    } catch (e) {
        console.log('Error jsonifying count message', countMessage);
        return;
    } 
    websocketServer.send(str);
}

// #Last shoutouts

var lastShoutouts = [];

function addToLastShoutouts (tweet) {
    if (lastShoutouts.length>10) { lastShoutouts.shift(); }
    lastShoutouts.push(tweet);
}

// #Twitter Stream Connect
var twitterAtClient = new TwitterAtClient();

// Connect the router up to the steaming twitter client 
twitterAtClient.on('tweet', twitterMiddleware.route );

// Connect the router up to the mock tweet system
mockTweetList.on('triggered', twitterMiddleware.route ); 

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