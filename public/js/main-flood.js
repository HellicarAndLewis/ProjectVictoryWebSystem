var jsonSocket;
var itemsToAdd = [];
var itemsToRemove = [];

$(function () {

    // Socket connect

    jsonSocket = createJSONSocket();

    
    // UI

    var $saveButton = $('.saveBadWords');
    var $shoutoutFloodButton = $('.shoutoutFlood');

    // Add default button
    
    $shoutoutFloodButton.on('click touch', function () {

        if ( $shoutoutFloodButton.hasClass('disabled') ) { return; }

        $shoutoutFloodButton.addClass('disabled');

        runFlood(function () {
            $shoutoutFloodButton.removeClass('disabled');
        });

    });

    (function () {
        // Commands
        var $commandsCheckbox = $('.commands');
        var $commandsRange = $('.range');
        var $commandsLastMessage = $('.lastMessage');
        var $commandsRate = $('.rate');
        
        var rate = 0;

        $commandsCheckbox.on('switch-change', function (e, data) {
            var $el = $(this);
            if (data.value) {
                startCommandFlood();
            } else {
                endCommandFlood();
            }
        });

        $commandsRange.on('change', updateRate);

        function updateRate() {
            rate = $commandsRange.val();
            $commandsRate.text( rate );
        }

        updateRate();

        var lastTrigger = 0;
        var timeoutId = 0;

        function startCommandFlood() {
            timeoutId = setTimeout(function () {
                
                var now = Date.now();
                if (now - lastTrigger > rate) {
                    lastTrigger = now;
                    $commandsLastMessage.text( now );
                    sendCommand();
                }
                startCommandFlood();
            }, 10);
        }

        function endCommandFlood() {
            clearTimeout(timeoutId);
        }
    }());

});


function runFlood(callback) {
    W.loop(100, function (i, next, end) {
        jsonSocket.send({
            resource: "/test/flood/",
            body: {
                flood: true
            }
        });
        setTimeout(next, 10);
    }, callback);
}

function sendCommand() {
    var command = {
        "resource": "/command/new/",
        "body": {
            "tweet": {
                "id": 10000 + Date.now(),
                "text": "@1948dev destort thick ",
                "inReplyToId": null,
                "inReplyToName": null,
                "userId": 0,
                "userName": "Dev list tweeter",
                "userScreenName": "1948devlist",
                "createdAt": 1381659911121,
                "hashTags": [],
                "userMentions": []
            },
            "payload": {
                "command": "destort thick ",
                "effects": [
                    {
                        "maps": {
                            "amount": 1,
                            "distort speed": 0,
                            "fine distort": 0.1000000014901161,
                            "roll speed": 0.1652590483427048,
                            "thick distort": 5.565217018127441
                        },
                        "name": "badtv"
                    }
                ],
                "payloadName": "thick-destort"
            }
        }
    };
    jsonSocket.send( command );
}
