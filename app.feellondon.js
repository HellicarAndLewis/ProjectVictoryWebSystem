// Application for Nike/H&L Project Victory


// # Setup

// ## Module Dependencies.
var express = require('express');
var http = require('http');
var lessMiddleware = require('less-middleware');
var path = require('path');
var fs = require('fs');
var argv = require('optimist').argv;
// ## Custom Modules
var jadeMiddleware = require(path.join(__dirname, 'libs/jade-middleware.js'));
var liveReload = require(path.join(__dirname, 'libs/live-reload.js'));
var WebSocketRepeater = require(path.join(__dirname, 'libs/ws-repeater.js'));
var TwitterAtClient = new require(path.join(__dirname, 'libs/twitter-at-client.js'));

if (argv.h || argv.help) {
    return;
}

// # HTML Server

// ## Options
var serveFromDirectory = path.resolve( argv.d || argv.dirname || path.join(__dirname, 'public/') );
var shouldWatchFiles = process.env.LIVE_RELOAD || argv.l || argv.livereload; 
// legacy
shouldWatchFiles = shouldWatchFiles || process.env.WATCH || argv.w || argv.watch; 

var app = express();
app.configure(function(){
    app.set('port', process.env.PORT || argv.p || 3000);
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    var jadeOptions = {
        pretty: true,
        basedir: serveFromDirectory
    };
    var jadeLayoutFile = path.join(serveFromDirectory, 'layout.jade');
    if ( fs.existsSync( jadeLayoutFile ) ) {
        jadeOptions.filename = jadeLayoutFile;
    }
    app.use(jadeMiddleware({
        src: serveFromDirectory,
        jadeOptions: jadeOptions
    }));
    app.use(lessMiddleware({
        src: serveFromDirectory
    }));
    app.use(express.static(serveFromDirectory));
    app.use(express.directory(serveFromDirectory));
});

app.configure('production', function(){
    console.log("Hmm.. servant should not be used for production");
});

var server = http.createServer(app);

// routing

app.get('/api/bad-words/', function () {
    
});

app.put('/api/bad-words/', function () {
    
});

// # Web Socket Server

// Create the web socket server
var websocketServer = new WebSocketRepeater({
    server: server
});

// # Twitter Stream Connect

var twitterAtClient = new TwitterAtClient();



// # Live Reloading
// To watch `WATCH=1 node app.js`
if (shouldWatchFiles) {
    liveReload.watch({
        pathPatterns: [serveFromDirectory+"/**/*"],
        server: server,
        app: app
    });
}
server.listen(app.get('port'), function() {
    console.log( lcyan("Servant", "serving")+ ":" );
    console.log( bold("\n   " + serveFromDirectory) );
    console.log("\nfrom port:",  green(app.get('port')) );
    if (shouldWatchFiles) {  console.log( "whilst watching for file changes.\nadd", lcyan("`/watch.js`"), " to your html for live reloading." ); }
});

// Bit of color
function green() { return "\033[1;32m" +  [].slice.apply(arguments).join(' ') + "\033[0m"; }
function green() { return "\033[1;32m" +  [].slice.apply(arguments).join(' ') + "\033[0m"; }
function lcyan() { return "\033[1;36m" + [].slice.apply(arguments).join(' ') + "\033[0m"; }
function bold() { return "\033[1m" + [].slice.apply(arguments).join(' ') + "\033[0m"; }