var moderationLevel = 1;
var jsonSocket;

$(function () {

    // add the level
    $('.connectionStatus').append('<div class="label label-info">Moderation Level:'+moderationLevel+'</div>');

    // Scrolling counter

    var scrollingCounter = new KeyCounter();
    scrollingCounter.on('reached 1', function (key) {
        $('.tweet[data-tweet-id='+key+']').addClass('someOneOver');
    });
    scrollingCounter.on('reached 0', function (key) {
        $('.tweet[data-tweet-id='+key+']').removeClass('someOneOver');
    });

    // Socket connect

    jsonSocket = createJSONSocket();

    // Socket routing

    var router = new W.Router();

    router
        .map('/moderation/'+moderationLevel+'/over/:id/').to(function(params) {
            scrollingCounter.increment(params.id);
        })
        .map('/moderation/'+moderationLevel+'/out/:id/').to(function(params) {
            scrollingCounter.decrement(params.id);
        })
        .map('/moderation/'+moderationLevel+'/approved/:id/').to(function(params) {
            $('.tweet[data-tweet-id='+params.id+']').addClass('approved').addClass('moderated');
        })
        .map('/moderation/'+moderationLevel+'/denied/:id/').to(function(params) {
            $('.tweet[data-tweet-id='+params.id+']').addClass('denied').addClass('moderated');
        });

    jsonSocket.on('json', function (data) {
        if (typeof data.resource !== 'undefined') {
            router.trigger(data.resource);
        }   
    });

    // 

    /// List view and ui

    var $el = $('#incoming-tweets');
    var listView = new infinity.ListView($el);
    listView.width = 300;
    listView.height = 300;

    // Buttons for moderaation

    $el.on('click touch','.deny', function (event) {
        var $el = $(event.currentTarget).parent().parent().parent().addClass('denied').addClass('moderated');
        var id = $el.data('tweet-id');
        sendDenied(id);
    });

    $el.on('click touch','.approve', function (event) {
        var $el = $(event.currentTarget).parent().parent().parent().addClass('approved').addClass('moderated');
        var id = $el.data('tweet-id');
        sendApproved(id);
    });

    // Mouseover and out

    $el.on('mouseover','.tweet', function (event) {
        var id = $(event.currentTarget).data('tweet-id');
        sendOver(id);
    });

    $el.on('mouseout','.tweet', function (event) {
        var id = $(event.currentTarget).data('tweet-id');
        sendOut(id);
    });

    // Clear all moderated
    
    $('.clearModerated').on('click touch', function () {

        // this is ugly, but infinity remove is broken
        while (listView.find('.moderated').length > 0) {
            listView.find('.moderated')[0].remove();
        }

    });

    // Debug adding items

    var addItemCounter = 0;

    function addItem() {
        
        var $newContent = ich['template-tweet']({
            id: ++addItemCounter,
            username: "@rossc1",
            text: "This is a tweet",
            time: getTime()
        });

        var item = listView.append($newContent);

        setTimeout(addItem, 333);
    }

    function getTime() {
        var d = new Date();
        return d.getHours() + ":" + d.getMinutes();
    }

    addItem();

});

// Socket messages

function sendOver(id) {
    jsonSocket.send({
        resource : "/moderation/"+moderationLevel+"/over/"+id+"/"
    });
}

function sendOut(id) {
    jsonSocket.send({
        resource : "/moderation/"+moderationLevel+"/out/"+id+"/"
    });
}

function sendApproved(id) {
    jsonSocket.send({
        resource : "/moderation/"+moderationLevel+"/approved/"+id+"/"
    });
}

function sendDenied(id) {
    jsonSocket.send({
        resource : "/moderation/"+moderationLevel+"/denied/"+id+"/"
    });
}

var KeyCounter = W.Object.extend({
    constructor : function (options) {
        W.extend(this, W.EventMixin);
        this.items = {};
    },
    increment : function(key) {
        if (typeof this.items[key] === 'undefined') {
            this.items[key] = 1;
            this.trigger('reached 1', key);
        } else if (typeof this.items[key] === 'number' && ++this.items[key] === 1) {
            this.trigger('reached 1', key);
        }
    },
    decrement : function (key) {
        if (typeof this.items[key] === 'number' && --this.items[key] === 0) {
            this.trigger('reached 0', key);
        }
    }
});