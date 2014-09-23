// @todo Vérification de ce qui est reçu (par exemple x et y en int pour setMyPos)
// @todo Utiliser mysql parce qu'on a des index pour x et y (pour récup haut à droite, utiliser les FIRIN' MUH LAZOR)
 
var http = require('http'),
    fs = require('fs'),
    url = require('url'),
    path = require('path'),
    index = fs.readFileSync(__dirname + '/public/index.html'),
    uuid = require('node-uuid'),
    db = require('db.js');
 
/*
%  ROUTES =================================================
*/

var express = require('express');
var app = express();

//on définit nos pages comme statiques et provenant de /public/
app.use(express.static(__dirname + '/public'));

// Gestion des routes

//Instance de router :
var router = express.Router();

router.route('/')
    .get(function(req,res,next){
        console.log("USR: IP = " + req.connection.remoteAddress);
        res.setHeader('Content-Type', 'text/html');
        res.sendfile('index.html'); 
    });

router.route('/:roomName')
    //effectue des opérations à partir du nom de la room
    .all(function(req, res, next){
        console.log("APP: checking roomName "+req.params.roomName);
        if ( req.params.roomName != "favicon.ico"){
            console.log("APP: Un utilisateur s'est connecté sur la room "+ req.params.roomName);
        }
        else console.log("APP: favicon.");
    })
    //affiche la room
    .get(function(req,res,next){
        console.log("APP: checked " +req.params.roomName);
        res.setHeader('Content-Type', 'text/html');
        //res.end('APP: Vous êtes sur la room '+ req.params.roomName);
        res.sendfile(__dirname+'/public/index.html'); 

    });

app.use('/', router);
app.use('/:roomName', router);


/*
%  SOCKET.IO=================================================
*/

var server = require('http').Server(app);
var io = require('socket.io').listen(server);
module.exports.io = io;

 
io.sockets.on('connection', function (socket) {

        // @todo : empêcher injections, et formater IP correctement anti collisions

/*
    1. quand un utilisateur se connecte à XAO, il join la room portant son IP
*/



        socket.on('userLogin', function (data, clientCallback) {

            var userIp = socket.conn.remoteAddress;
            var userSocketId = socket.id;
            var userFullName = data.fullName;


            //convertit l'IP en décimal
            userIp = dot2num(userIp);

            var socketIOroom = userIp.toString();
            //join l'utilisateur à une room socket.io ayant son IP comme nom
            socket.join(socketIOroom);

            //ajoute l'utilisateur dans la DB, et envoie la liste des onlineUsers à tous ceux 
            //partageant la même IP que lui.
            // 
            db.newOnlineUser(userIp, userSocketId, userFullName, emitOnlineUsers(userIp, socket));

            clientCallback({ok:true});

        }),

        socket.on('createMyRoom', function (data, clientCallback){

            //::::::  EASY WAY ::::::
            db.executeInsertQuery("INSERT INTO Rooms (userMap) VALUES (NULL)",
              function(result)
              {
                console.log("room ID = " + result.insertId + " socket ID : "+ socket.id);
                db.executeUpdateQuery("UPDATE OnlineUsers SET roomID = '"+result.insertId+"' WHERE socketID = '"+socket.id+"'",
                  function() 
                  {
                    socket.join(uniqueRoomID);
                    if (err) 
                    {
                      clientCallback({error:'NO_ACCESS_ROOM', msg:'could not join room'});
                      return;
                    }

                    clientCallback({ok:true});
                  } 
                )
              }
            );

        }),

        socket.on('joinTheRoom', function (data, clientCallback){
            //récupérer la room d'un utilisateur depuis son ID
            // @todo : IMPORTANT : ne pas faire confiance à l'userID procuré par le client...?
            db.executeSelectQuery("SELECT RoomID FROM OnlineUsers WHERE UserID = "+data.userID+"",
              function(results, clientCallback) 
              {
                var roomToJoin = results[0].userID;
                socket.join(roomToJoin);
                db.executeUpdateQuery("UPDATE OnlineUsers SET roomID = '"+roomToJoin+"'' WHERE userID = '"+data.userID+"'",
                  function(clientCallback)
                  {
                    clientCallback({ok:true});
                  }
                )
              }
            );
        }),


       socket.on('updatePosition', function (data){
        //reçoit la nouvelle position d'un utilisateur : X, Y et angle
        //met à jour la DB
        //
        db.executeUpdateQuery("UPDATE OnlineUsers SET posX = "+data.posX+", posY = "+data.posY+", angle = "+data.angle+" WHERE socketID = '"+socket.id+"'",
            function(socket)
            {
                //cherche la roomID en DB... changer ça ;____;
                db.executeSelectQuery("SELECT roomID FROM OnlineUsers WHERE socketID ='"+socket.id+"'",
                    function(socket, results)
                    {

                    }
                )
                io.to()

                emit
            }
        )
       }),

        // @param data = { relX, relY, message }
        socket.on('send', function (data) {
                console.log('send');
                console.log(users);

                var destX = users[id].x + data.relX;
                var destY = users[id].y + data.relY;
               
                console.log('USR: dest ' + destX + ' ' + destY);
               
                for (var i=0; i<users.length; i++) // @todo convert db
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

/*

    ========= Liste des events
    socket.on 
        connection
            userLogin
                ajouter un onlineUser
                envoyer la liste des users du réseau

            onlineUsersList
                renvoie tout le contenu de
                "SELECT * FROM OnlineUsers WHERE IP = '"+IP+"'"


            sendMesssage
                déjà fait

            updatePosition
                maj DB
                emettre la map à toute le room

            joinRoom
                ajoute l'utilisateur à une room.

            leaveRoom
                faire quitter la room sio a l'user, 
                update OnlineUsers,
                update la Room

    fonctions :
        createRoom()
            crée une room ayant un ID unique.   
        deleteRoom(roomID)
            supprime la room roomID

*/


//convertir des IP à points en décimal
// format "AAA.BBB.CCC.DDD" vers "XXXXXXXXXXX"
function dot2num(dot) 
{
    var d = dot.split('.');
    return ((((((+d[0])*256)+(+d[1]))*256)+(+d[2]))*256)+(+d[3]);
}
function num2dot(num) 
{
    var d = num%256;
    for (var i = 3; i > 0; i--) 
    { 
        num = Math.floor(num/256);
        d = num%256 + '.' + d;
    }
    return d;
}

// IMPORTANT : manage socket.io rooms
function emitOnlineUsers(IP, socket) {
    db.connect();
    db.mySqlClient.getConnection(function(err, connection){
      connection.query("SELECT * FROM OnlineUsers WHERE IP = '"+IP+"'",
      function(err, results){
        if (err) throw err;

        console.log("> get online users callback");

        //change l'IP en string et envoie à la room correspondante le message.
        var socketIOroom = IP.toString();
        io.to(socketIOroom).emit("onlineUserList", {list : results})
        connection.release();
      })
    })
}

function emitToRoom(socket, event, data) {
    db.connect();
    db.mySqlClient.getConnection(function(err, connection){
      connection.query("SELECT roomID FROM OnlineUsers WHERE socketID = '"+socket.id+"'",
      function(err, results){
        if (err) throw err;

        console.log("> emit to users in room "+ results.roomID);

        //change l'IP en string et envoie à la room correspondante le message.
        var socketIOroom = results.roomID;
        io.to(socketIOroom).emit("newPosition", {list : results})
        connection.release();
      })
    })
}
 
server.listen(8081);




