var jsonSocket;
var itemsToAdd = [];
var itemsToRemove = [];

var Flood = W.Object.extend({
    // Events
    // * flood triggered
    constructor : function (options) {

        var self = this;
        W.extend(self, W.EventMixin);
        
        // Create the EL
        this.$el = $(ich["template-flood"]({
            title : options.title || "Flood",
            label: options.label || "Label"
        }));

        // Append to it
        if (options.appendTo) {
            options.appendTo.append(this.$el);
        }

        // Commands
        var $checkboxEl = this.$el.find('.commands').bootstrapSwitch();
        var $rangeEl = this.$el.find('.range');
        var $lastMessageEl = this.$el.find('.lastMessage');
        var $rateEl = this.$el.find('.rate');

        var rate = 0;

        $checkboxEl.on('switch-change', function (e, data) {
            var $el = $(this);
            if (data.value) {
                startFlood();
            } else {
                endFlood();
            }
        });

        $rangeEl.on('change', updateRate);
        function updateRate() {
            rate = $rangeEl.val();
            $rateEl.text( rate );
        }
        updateRate();

        var lastTrigger = 0;
        var timeoutId = 0;

        function startFlood() {
            timeoutId = setTimeout(function () {
                
                var now = Date.now();
                if (now - lastTrigger > rate) {
                    lastTrigger = now;
                    $lastMessageEl.text( new Date() );
                    self.trigger('flood triggered');
                }
                startFlood();
            }, 10);
        }

        function endFlood() {
            clearTimeout(timeoutId);
        }
    }
});

var RandomSentence = W.Object.extend({
    constructor : function (options) {
        if (!options) { options = {}; }
        this.subjects= options.subjects || ['I','You','Bob','John','Sue','Kate','The lizard people'];
        this.verbs= options.verbs || ['will search for','will get','will find','attained','found','will start interacting with','will accept','accepted'];
        this.objects= options.objects || ['Billy','an apple','a Triforce','the treasure','a sheet of paper'];
        this.endings= options.endings || ['.',', right?','.',', like I said.','.',', just like your momma!'];
    },
    get : function () {
        return this.subjects[Math.round(Math.random()*(this.subjects.length-1))]+' '+this.verbs[Math.round(Math.random()*(this.verbs.length-1))]+' '+this.objects[Math.round(Math.random()*(this.objects.length-1))]+this.endings[Math.round(Math.random()*(this.endings.length-1))];
    }
});

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

    // #Set up floods
    
    var floodsContainer = $('.floods');

    // ##Commands

    // Helper
    function createCommandFlood(command, effect) {
        var commandFlood = new Flood({
            title : "Command: " + command,
            label : "Floods '"+command+"' command",
            appendTo : floodsContainer
        });

        commandFlood.on('flood triggered', function () {
            sendCommand("@1948dev "+command, command, effect);
        });
    }

    createCommandFlood( "distort", "griddistort");
    createCommandFlood( "wavy", "badtv" );
    createCommandFlood( "scan", "scanlines" );
    createCommandFlood( "trail", "flowlines" );
    createCommandFlood( "hyper", "khronos" );   
    createCommandFlood( "glitch", "rgbshift" );
    createCommandFlood( "spectrum", "spectrum" );

    // ##Shoutouts

    var shoutoutFlood = new Flood({
        title : "Shoutouts: random",
        label : "Floods shoutouts with random sentences",
        appendTo : floodsContainer
    });

    var randomSentence = new RandomSentence();

    shoutoutFlood.on('flood triggered', function () {
        sendShoutout( "@1948dev #shoutout " + randomSentence.get() );
    });

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

function sendShoutout(tweetText) {
    var shoutout = {
        "resource": "/shoutout/new/",
        "body": {
            "tweet": {
                "id": "99999" + Date.now(),
                "text": tweetText,
                "inReplyToId": null,
                "inReplyToName": null,
                "userId": 0,
                "userName": "Dev list tweeter",
                "userScreenName": "1948devlist",
                "createdAt": 1381839595674,
                "hashTags": [
                    {
                        "text": "shoutout"
                    }
                ],
                "userMentions": []
            }
        }
    };
    jsonSocket.send( shoutout );
}

function sendCommand(tweetText, command, effect) {
    var command = {
        "resource": "/command/new/",
        "body": {   
            "tweet": {
                "id": "99999" + Date.now(),
                "text": tweetText,
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
                "command": command,
                "effects": [
                    {
                        "maps": {
                            "amount": 1,
                            "distort speed": 0,
                            "fine distort": 0.1000000014901161,
                            "roll speed": 0.1652590483427048,
                            "thick distort": 5.565217018127441
                        },
                        "name": effect
                    }
                ],
                "payloadName": command
            }
        }
    };
    jsonSocket.send( command );
}
