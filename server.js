var http = require('http'),
    fs = require('fs'),
    // NEVER use a Sync function except at start-up!
    index = fs.readFileSync(__dirname + '/server_index.html');

// Send index.html to all requests
var app = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index);
});

// Socket.io server listens to our app
var io = require('socket.io').listen(app);

var users = { }; // pos => {socket}

io.sockets.on('connection', function(socket) {
	socket.on('setPos', function (pos)	{ users[pos] = socket; socket.pos = pos; });
	socket.on('send', function (data) { if (users[data.to]) users[data.to].emit('get',{from: socket.pos, msg: data.msg}); });
});

app.listen(8081);