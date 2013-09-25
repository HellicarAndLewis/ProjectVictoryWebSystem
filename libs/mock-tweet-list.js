var util = require('util');
var EventEmitter = require('events').EventEmitter;

function DevTweetList(options) {
    var self = this;
    this.redisClient = options.redisClient;

    this.middleware = {
        get: function (req, res) {
            retrieveTweets(self.redisClient, function (err, arr) {
                if (err) {
                    res.json(500, err);
                    return;
                }
                res.json(arr);
            });
        },
        post: function (req, res) {
            storeTweet(self.redisClient, req.body, function (err) {
                if (err) {
                    req.json(500, err);
                    return;
                }
                res.json("ok");
            });
        },
        delete: function (req, res) {
            var tweetId = req.params.tweetId;
            removeTweetById(self.redisClient, tweetId, function (err) {
                if (err) {
                    req.json(500, err);
                    return;
                }
                res.json("ok");
            });
        },
        trigger: function (req, res) {
            var tweetId = req.params.tweetId;
            retrieveTweetById(self.redisClient, tweetId, function (err, tweet) {
                if (err) {
                    req.json(500, err);
                    return;
                }
                self.emit('triggered', tweet);
                res.json("ok");
            });
        }
    };
}

util.inherits(DevTweetList, EventEmitter);

//#Utils


var redisSetKey = 'devtweetsl';

function storeTweet(redisClient, tweet, callback) {
    var str;
    try {
        str = JSON.stringify(tweet);
    } catch(e) {
        console.log('Error jsonifying tweet', tweet);
        return;
    }
    // Store in redis
    var multi = redisClient.multi();
    var key = 'devtweets:'+tweet.id;
    multi.set(key, str);
    multi.expire(key, 60*60*24*7*7); // 7 weeks
    multi.sadd(redisSetKey, key);
    multi.expire(redisSetKey, 60*60*24*7*7); // 7 weeks
    multi.exec(callback);
}

function retrieveTweets(redisClient, callback) {
    redisClient.smembers(redisSetKey, function (err, arr) {
        if (err) {
            callback(err);
            return;
        }
        var multi = redisClient.multi();

        var errorParseingJson = false;

        // Cycle through each tweet in the set
        arr.forEach(function (tweetRedisId) {
            multi.get(tweetRedisId);
        });

        if (errorParseingJson) {
            callback(errorParseingJson);
            return;
        }

        // Go grab them all
        multi.exec(function (err, resultsJsonArry) {

            var results = [];
            resultsJsonArry.forEach(function (str) {
                var json;
                try {
                    json = JSON.parse(str);
                } catch (e) {
                    console.log('Error parseing JSON for retreieved dev tweets');
                    return;
                }
                results.push(json);
            });
            
            callback(null, results);
        });
    });
}

function retrieveTweetById(redisClient, id, callback) {
    redisClient.get('devtweets:'+id, function (err, tweetAsString) {
        if (err) {
            callback(err);
            return;
        }
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

function removeTweetById(redisClient, id, callback) {
    var multi = redisClient.multi();
    multi.srem(redisSetKey, 'devtweets:'+id);
    multi.del('devtweets:'+id);
    multi.exec(function (err) {
        callback(err);
    });
}

//#Exports

module.exports = DevTweetList;