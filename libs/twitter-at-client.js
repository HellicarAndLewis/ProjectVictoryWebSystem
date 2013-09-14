var Twit = require('twit');
var argv = require('optimist').argv;

function TwitterAtClient(options) {
    if (!options) { options = {}; }

    var credentials = {
        consumer_key : options.consumerKey || process.env.CONSUMER_KEY || argv.consumerKey,
        consumer_secret : options.consumerSecret || process.env.CONSUMER_SECRET || argv.consumerSecret,
        access_token : options.accessTokenKey || process.env.ACCESS_TOKEN_KEY || argv.accessTokenKey,
        access_token_secret : options.accessTokenSecret || process.env.ACCESS_TOKEN_SECRET || argv.accessTokenSecret,
    };

    console.log("credentials", credentials);

    this.twtter = new Twit(credentials);

    var stream = this.twtter.stream('user');

    stream.on('error', function (err) {
        console.log("error", err);
    });

    stream.on('tweet', function (tweet) {
        console.log(tweet);
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
    })

    stream.on('warning', function (warning) {
        console.log("warning", warning);
    })

    // var credentials = {
    //     consumer_key : options.consumerKey || process.env.CONSUMER_KEY || argv.consumerKey,
    //     consumer_secret : options.consumerSecret || process.env.CONSUMER_SECRET || argv.consumerSecret,
    //     access_token_key : options.accessTokenKey || process.env.ACCESS_TOKEN_KEY || argv.accessTokenKey,
    //     access_token_secret : options.accessTokenSecret || process.env.ACCESS_TOKEN_SECRET || argv.accessTokenSecret,
    // };

    // this.twtter = new Twitter(credentials);

    // this.twtter.stream('statuses/sample', function(stream) {
    //   stream.on('data', function (data) {
    //     console.log(data);
    //   });
    // });


    // this.twtter.stream('user', {track:'nodejs'}, function (stream) {
    //     stream.on('data', function (data) {
    //         console.log(data);
    //     });
    //     stream.on('end', function (response) {
    //         // Handle a disconnection
    //     });
    //     stream.on('destroy', function (response) {
    //         // Handle a 'silent' disconnection from Twitter, no end/error event fired
    //     });
    //     // Disconnect stream after five seconds
    //     setTimeout(stream.destroy, 5000);
    // });



    // try {

    //     this.twtter.stream('user', {
    //         replies : "all"
    //     }, function(stream) {
    //         console.log("stream");
    //         // stream.on('data', function (data) {
    //         //     console.log(data);
    //         // });
    //     });

//     } catch (e) {
//         console.log("");
//     }
}

module.exports = TwitterAtClient;