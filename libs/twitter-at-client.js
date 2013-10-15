var Twit = require('twit');
var argv = require('optimist').argv;
var util = require('util');
var EventEmitter = require('events').EventEmitter;

// #TwitterAtClient
//
// ##Events:
// * tweet
//
function TwitterAtClient(options) {
    var self = this;
    EventEmitter.call(this);

    if (!options) { options = {}; }

    var credentials = {
        consumer_key : options.consumerKey || process.env.CONSUMER_KEY || argv.consumerKey,
        consumer_secret : options.consumerSecret || process.env.CONSUMER_SECRET || argv.consumerSecret,
        access_token : options.accessTokenKey || process.env.ACCESS_TOKEN_KEY || argv.accessTokenKey,
        access_token_secret : options.accessTokenSecret || process.env.ACCESS_TOKEN_SECRET || argv.accessTokenSecret,
    };

    this.twitter = new Twit(credentials);

    var stream = this.twitter.stream('user');

    stream.on('error', function (err) {
        console.log("error", err);
    });

    stream.on('tweet', function (tweet) {
        self.emit('tweet', getTweetObj(tweet));
    });

    stream.on('connect', function (request) {
        request.on('error', function (err) {
            console.log("error", arguments);
        });
        //console.log("connecting stream", request);
    });

    stream.on('user_event', function (eventMsg) {
        console.log("user_event");
    });

    stream.on('reconnect', function (request, response, connectInterval) {
        console.log("reconnect");
    });

    stream.on('disconnect', function (disconnectMessage) {
        console.log("disconnect", disconnectMessage);
    });

    stream.on('warning', function (warning) {
        console.log("warning", warning);
    });

}

function getTweetObj(tweet) {

    // Just to be sure
    if (!tweet.user) { tweet.user = {}; }
    if (!tweet.entities) { tweet.entities = {}; }
    if (!tweet.entities.hashtags) { tweet.entities.hashtags = []; }
    if (!tweet.entities.user_mentions) { tweet.entities.user_mentions = []; }

    var data = {
        id : tweet.id,
        idStr : tweet.id_str,
        text : tweet.text,
        inReplyToId : tweet.in_reply_to_user_id,
        inReplyToName : tweet.in_reply_to_screen_name,
        userId : tweet.user.id,
        userName : tweet.user.name,
        userScreenName : tweet.user.screen_name,
        createdAt : Date.parse(tweet.created_at.replace(/( \+)/, ' UTC$1')),
        hashTags : tweet.entities.hashtags,
        userMentions : tweet.entities.user_mentions
    };

    return data;
}

util.inherits(TwitterAtClient, EventEmitter);

module.exports = TwitterAtClient;