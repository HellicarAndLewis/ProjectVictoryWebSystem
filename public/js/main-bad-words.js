var jsonSocket;
var itemsToAdd = [];
var itemsToRemove = [];

$(function () {

    // Socket connect

    jsonSocket = createJSONSocket();

    // Create the tag view
    
    getTagsFromServer(function (err, tags) {
        tags = tags.sort();
        $('#tags').val(tags.join(',')).tag().on('added', addedHandler).on('removed', removedHandler);
    });

    function addedHandler(e, item) {
        itemsToAdd.push(item);
    }

    function removedHandler(e, arr) {
        itemsToRemove = itemsToRemove.concat(arr);
    }

    // UI

    var $saveButton = $('.saveBadWords');
    var $addDefaultButton = $('.addDefault');

    // Add default button
    
    $addDefaultButton.on('click touch', addDefaultSet);

    // Save button

    $saveButton.on('touch click', function () {
        if ($saveButton.hasClass('disabled')) { return; }

        W.sequence()
            // disbale the buttons
            .then(function () {
                $saveButton.addClass('disabled');
            })
            // add any new items
            .then(function (done) {
                if ( itemsToAdd.length === 0 ) {
                    done();
                    return;
                }
                addTagsToServer(function (err, result) {
                    if (err) {  
                        console.log("Error adding new items to server", err);
                    }
                    done();
                });
            })
            // remove any removed items
            .then(function (done) {
                if ( itemsToRemove.length === 0 ) {
                    done();
                    return;
                }
                removeTagsToServer(function (err, result) {
                    if (err) {  
                        console.log("Error removing items from server", err);
                    }
                    done();
                });
                return;
            })
            // enable the button
            .then(function () {
                $saveButton.removeClass('disabled');
            })
            .start();
    });

});

// Server interactions

function getTagsFromServer(callback) {
    var req = superagent
        .get( cfg.HOST + "api/bad-words/" );

    req.end(function(error, res){
        callback(error, res.body);
    });
}

function addTagsToServer(callback) {
    var req = superagent
        .post( cfg.HOST + "api/bad-words/" )
        .send({ items:itemsToAdd });

    req.end(function(error, res){
        callback(error, res);
    });
}

function removeTagsToServer(callback) {
    console.log("this", itemsToRemove);
    var req = superagent
        .del( cfg.HOST + "api/bad-words/" )
        .send({ items:itemsToRemove });

    req.end(function(error, res){
        callback(error, res);
    });
}
