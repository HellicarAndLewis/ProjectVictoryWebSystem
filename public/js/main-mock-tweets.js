var jsonSocket;

$(function () {
    
    // Socket connect

    jsonSocket = createJSONSocket();

    // List view
    
    var $el = $('#previous-tweets');
    var listView = new infinity.ListView($el);
    listView.width = 300;
    listView.height = 300;

    // Interactions
    
    var $nameEl = $('.tweetname');
    var $textEl = $('.tweettext');

    var $saveButtonEl = $('.save');

    $saveButtonEl.on('click touch', function () {

        if ($saveButtonEl.hasClass('disabled')) { return; }

        if (!validateElValue($nameEl) || !validateElValue($textEl) ) { 
            alert("Missing text or screen name");
            return; 
        }

        $saveButtonEl.addClass('disabled');

        postNewTweet(function (err) {
            if (err) {
                alert(err);
                return;
            }   
            $saveButtonEl.removeClass('disabled');

            // reloading for now
            window.location.reload();
        });
    });

    function validateElValue($el) {
        console.log($el[0], $el.val());
        return (typeof $el.val() === 'string' && $el.val().length > 0);
    }   

    function postNewTweet(callback) {
        var date = new Date();
        var tweet =  {
            id : Date.now(),
            text : $textEl.val(),
            inReplyToId : null,
            inReplyToName : null,
            userId : 0,
            userName : "Dev list tweeter",
            userScreenName : $nameEl.val(),
            createdAt : Date.now(),
            hashTags : getHashTagsFromText($textEl.val()),
            userMentions : []
        };
        var req = superagent
            .post( cfg.HOST + "api/mock-tweet-list/" )
            .send(tweet);

        req.end(function(error, res){
            callback(error, res);
        });
    }

    // Get the content
    
    superagent
        .get( cfg.HOST + "api/mock-tweet-list/" )
        .end(function(error, res){
            res.body.forEach(function (tweet) {
                addTweetView(tweet);
            });
        });

    function addTweetView(tweet) {
        console.log(tweet);
        var $newContent = ich['template-tweet']({
            id: tweet.id,
            username: tweet.userScreenName,
            text: tweet.text,
            time: tweet.createdAt
        });
        var item = listView.append($newContent);
    }

    // Buttons for moderaation

    $el.on('click touch','.trigger', function (event) {
        var $el = $(event.currentTarget).parent().parent().parent();
        var id = $el.data('tweet-id');
        console.log('trigger', id);
        sendTriggerTweet(id);
    });

    $el.on('click touch','.remove', function (event) {
        var $el = $(event.currentTarget).parent().parent().parent();
        var id = $el.data('tweet-id');
        console.log('remove', id);
        sendRemoveTweet(id, function (err) {
            window.location.reload();
        });
    });

    // Server 
    function sendTriggerTweet(id) {
        superagent
            .get( cfg.HOST + "api/mock-tweet-list/trigger/"+id+"/" )
            .end(function(err, res){
                if (err) {
                    console.log("Error triggering tweet", err);
                }
            });
    }

    function sendRemoveTweet(id, callback) {
        superagent
        .del( cfg.HOST + "api/mock-tweet-list/"+id+"/" )
            .end(function(err, res){
                if (err) {
                    console.log("Error triggering tweet", err);   
                }
                callback(err);
            });
    }  

    function getHashTagsFromText(text) {
        var hastags = [];
        var result = $textEl.val().match(/#([^ ]*)/m);
        for (var i = 1; i<result.length; i += 2) {
            hastags.push({
                text : result[i]
            });
        }
        return hastags;
    }



});