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

