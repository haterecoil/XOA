// @todo Vérification de ce qui est reçu (par exemple x et y en int pour setMyPos)
// @todo Utiliser mysql parce qu'on a des index pour x et y (pour récup haut à droite, utiliser les FIRIN' MUH LAZOR)
 
var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    index = fs.readFileSync(__dirname + '/public/index.html'),
    db = require('db.js');
 
/*
%  ROUTES =================================================
*/

var express = require('express');
var app = express();

//on définit nos pages comem statique et provenant de /public/
app.use(express.static(__dirname + '/public'));

// Gestion des routes

//Instance de router :
var router = express.Router();

router.route('/')
    .get(function(req,res,next){
        res.setHeader('Content-Type', 'text/plain');
        res.sendFile('index.html'); 
    });

router.route('/:roomName')
    //effectue des opérations à partir du nom de la room
    .all(function(req, res, next){
        console.log("APP: checking roomName "+req.params.roomName);
        if ( req.params.roomName != "favicon.ico"){
            console.log("APP: Un utilisateur s'est connecté sur la room "+ req.params.roomName);
            db.connect();
            db.checkIfRoom(req.params.roomName);
            next();
        }
        else console.log("APP: favicon.");
    })
    //affiche la room
    .get(function(req,res,next){
        console.log("APP: checked " +req.params.roomName);
        res.setHeader('Content-Type', 'text/plain');
        res.end('APP: Vous êtes sur la room '+ req.params.roomName);
        //res.sendFile('index.html'); 

    });

app.use('/', router);
app.use('/:roomName', router);


/*
%  SOCKET.IO=================================================
*/

var server = require('http').Server(app);

// Socket.io server listens to our app
var io = require('socket.io').listen(server);
 
var users = []; // tableau users. users[id] = { x:, y:, angle: } // 0 correspond à l'angle par rapport à l'axe vertical, orienté vers le haut
var id2socket = []; // id2socket[id] = socket;
 
io.sockets.on('connection', function(socket) {
       
        var id = users.length;
        console.log(id);
        users[id] = {x: -999, y: -999, angle: 0}; // angle en magnétisme 45
        id2socket[id] = socket; // @todo transformer ça en BDD parce que ça va bientôt être galère je crois
       console.log("Socket has connected : ");
       console.log(socket);
        socket.on('disconnect', function (pos)  { 
            users.splice(id, 1);
            id2socket.splice(id, 1);
            console.log('USR: disconnection');
            console.log(users);
        });
       
        socket.on('getAllPos', function (pos)   { socket.emit('allPos',users); });

        socket.on('setMyPos', function (pos)    { 
            users[id].x = pos.x; users[id].y = pos.y; 
            console.log('USR: setmypos'+ pos);
            console.log(users); 
        });

        socket.on('setUser', function (name, x, y) {
            db.setNewUser(name, x, y, socket);
        }); 

       
       
        // @param data = { relX, relY, message }
        socket.on('send', function (data) {
                console.log('send');
                console.log(users);

                var destX = users[id].x + data.relX;
                var destY = users[id].y + data.relY;
               
                console.log('USR: dest ' + destX + ' ' + destY);
               
                for (var i=0; i<users.length; i++) // @todo convert mongodb
                {
                        console.log('i = ' + i + ' x ' + users[i].x + ' y ' + users[i].y);
                        if (users[i].x == destX && users[i].y == destY)
                        {
                                console.log('USR: target locked');
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
 
 
 
server.listen(8081);