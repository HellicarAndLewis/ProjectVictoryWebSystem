// # Module Dependencies.

// ## Module Dependencies.
var argv = require('optimist').argv;
var lazy = require('lazy');
var fs = require('fs');
var Twitter = require('ntwitter');

// ## Options
var credentials = {
    consumer_key : process.env.CONSUMER_KEY || argv.consumerKey,
    consumer_secret : process.env.CONSUMER_SECRET || argv.consumerSecret,
    access_token_key : process.env.ACCESS_TOKEN_KEY || argv.accessTokenKey,
    access_token_secret : process.env.ACCESS_TOKEN_SECRET || argv.accessTokenSecret,
};

// Read in all the sample tweets
var sampleTweets = [];
new lazy(fs.createReadStream(__dirname+'/data/sample.tweets.txt'))
    .lines
    .forEach(function(line){
        sampleTweets.push(line.toString('utf8'));
    })
    .on('pipe', function () {
        startTweeting();
    });

function getRandomTweet() {
    return sampleTweets[Math.floor(Math.random()*sampleTweets.length)];
}

function startTweeting() {
    // action a tweet
    var twitter = new Twitter(credentials);

    twitter
        .verifyCredentials(function (err, data) {
            if (err) {
                console.log("Error verifyCredentials", err);
            }
        })
        .updateStatus(getRandomTweet(),
            function (err, data) {
                if (err) {
                    console.log("Error updateStatus", err);
                } else {
                    console.log("Tweet sent");
                }
            }
        );
}


