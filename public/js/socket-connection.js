function createJSONSocket() {
    jsonSocket = new W.JSONSocketConnection({
        socketUrl : cfg.SOCKET_URL
    });

    var socketIsLive = false;
    jsonSocket.on('open', function () { socketIsLive = true; $('.connectionStatus .connected').removeClass('hidden'); $('.connectionStatus .disconnected').addClass('hidden'); } );
    jsonSocket.on('close', function () { socketIsLive = false; $('.connectionStatus .connected').addClass('hidden'); $('.connectionStatus .disconnected').removeClass('hidden'); } );
    jsonSocket.openSocketConnection();
    return jsonSocket;
}