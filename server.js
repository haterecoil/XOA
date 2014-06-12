// @todo Vérification de ce qui est reçu (par exemple x et y en int pour setMyPos)

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

var users = []; // tableau users. users[id] = { x:, y: }
var id2socket = []; // id2socket[id] = socket;

io.sockets.on('connection', function(socket) {
	
	var id = users.length;
	users[id] = {x: -999, y: -999};
	id2socket[id] = socket;
	
	socket.on('disconnect', function (pos)	{ delete users[id]; delete id2socket[id]; });
	
	socket.on('getAllPos', function (pos)	{ socket.emit('allPos',users); });
	socket.on('setMyPos', function (pos)	{ users[id].x = pos.x; users[id].y = pos.y; console.log('setmypos');
		console.log(users); });
	
	
	// @param data = { relX, relY, message }
	socket.on('send', function (data) {
		console.log('send');
		console.log(users);
		var destX = users[id].x + data.relX;
		var destY = users[id].y + data.relY;
		
		console.log('dest ' + destX + ' ' + destY);
		
		for (var i=0; i<users.length; i++) // @todo convert mongodb
		{
			console.log('i = ' + i + ' x ' + users[i].x + ' y ' + users[i].y);
			if (users[i].x == destX && users[i].y == destY)
			{
				console.log('send');
				id2socket[i].emit('message',{from: id, relX: -data.relX, relY: -data.relY, message: data.message});
				break;
			}
		}
		
		// if (users[data.to])
		// users[data.to].emit('get',{from: socket.pos, msg: data.msg});
	});
});




// on getPos
// > sendPos

// on setPos
// > -5,-5



app.listen(8081);