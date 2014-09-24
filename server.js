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


        //lorsque un client entre son nom et prénom, rentre son IP, son socket et son nom en DB
        //émet une nouvelle liste lanUsers
        socket.on('userLogin', function (data) {

            var userIp = socket.conn.remoteAddress;
            var userSocketId = socket.id;
            var userFullName = data.fullName;

            //convertit l'IP en décimal puis en string
            userIp = dot2num(userIp);
            var socketIOroom = userIp.toString();
            //join l'utilisateur à une room socket.io ayant son IP comme nom
            socket.join(socketIOroom);

            //ajoute l'utilisateur dans la DB, et envoie la liste des onlineUsers à tous ceux 
            //partageant la même IP que lui.
            // 
            db.newOnlineUser(userIp, userSocketId, userFullName, emitLanUsers(userIp, socket));
        }),

        //lorsque un client crée son salon    NE FONCITONNE PAS IMPORTANT
        //INSERT en DB
        //UPDATE OnlineUsers
        //join le socket à la room correspondante
        //déclenche le callback Client
        socket.on('createMyRoom', function (data){
            //::::::  EASY WAY ::::::
            db.executeInsertQuery("INSERT INTO Rooms VALUES (default, null)",
              function(result)
              {
                db.executeUpdateQuery("UPDATE OnlineUsers SET roomID = '"+result.insertId+"' WHERE socketID = '"+socket.id+"'",
                  function() 
                  {
                    socket.join(result.insertId);
                    io.to(socket.id).emit("roomCreated");
                  } 
                )
              }
            );
        }),

        //lorsque un client rejoint un salon
        //@param data obj userID
        socket.on('joinTheRoom', function (data){
            //récupérer la room d'un utilisateur depuis son ID
            // @todo : IMPORTANT : ne pas faire confiance à l'userID procuré par le client...?
            db.executeSelectQuery("SELECT RoomID FROM OnlineUsers WHERE socketID = "+socket.id+"",
              function(results) 
              {
                var roomToJoin = results[0].userID;
                socket.join(roomToJoin);
                db.executeUpdateQuery("UPDATE OnlineUsers SET roomID = '"+roomToJoin+"'' WHERE socketID = '"+socket.id+"'",
                    io.to(socket.id).emit("roomJoined")
                )
              }
            );
        }),

        //update OnlineUsers, enlève la roomID
        //fais leave la room au socket
        socket.on('leaveTheRoom', function (){
            db.executeSelectQuery("SELECT RoomID FROM OnlineUsers WHERE socketID = "+socket.id+"",
              function(results) 
              {
                var roomToLeave = results[0].userID;
                socket.join(roomToLeave);
                db.executeUpdateQuery("UPDATE OnlineUsers SET roomID = NULL WHERE socketID = '"+socket.id+"'",
                    io.to(socket.id).emit("roomLeft")
                )
              }
            );
        })

        //lorsque un client se positionne dans le salon
        //@param data obj posX, posY, angle, roomId
       socket.on('updatePosition', function (data){
        db.executeUpdateQuery("UPDATE OnlineUsers SET posX = "+data.posX+", posY = "+data.posY+", angle = "+data.angle+" WHERE socketID = '"+socket.id+"'",
            emitUserMap(socket, data.roomId)
        )
       }),

        //@param data = { relX, relY, message }
        //les coordonnées sont +1, 0 ou -1
        socket.on('send', function (data) {
            //récupère la position
            db.executeSelectQuery("SELECT posX, posY FROM OnlineUsers WHERE socketID = '"+socket.id+"'",
                function(results)
                {
                    var destX = results.posX + data.posX;
                    var destY = results.posY + data.posY;

                    db.executeSelectQuery("SELECT socketID FROM OnlineUsers WHERE posX = "+destX+" AND posY = "+destY+"", function(results){
                        var destinataire = results[0].socketID;
                        io.to(destinataire).emit("message", data.message);
                    })
                }
            )
            //select l'user correspondant
        });
});

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

// Emet la liste des personens en LAN avec le client qui se connecte
//@params IP int l'IP du client
//@params socket object qui contient le socket du client initiant la fonciton
//@return lanList object la liste des lan Users formatée.
function emitLanUsers(IP, socket) {
    db.connect();
    db.mySqlClient.getConnection(function(err, connection){
      connection.query("SELECT * FROM OnlineUsers WHERE IP = '"+IP+"' ORDER BY roomID DESC",
      function(err, results){
        if (err) throw err;

        console.log("> get lan users ");

        //trier les users sans groupes et les users avec groupe.

        var dernierGroupe = [];
        var dernierGroupeId = -1;
        var lanList = [];

        for ( var i = 0; i < results.length; i++)
        {
            if ( results[i].roomID == null) 
            {
                lanList.push({type: "user", uid: results[i].userID, fullName: results[i].fullName, hasRoom: false});
            }
            else
            {

                if ( results[i].roomID == dernierGroupeId) {
                    dernierGroupe.push({type: "user", uid: results[i].userID, fullName: results[i].fullName, hasRoom: true});
                }
                else 
                {
                    if ( dernierGroupeId != -1 )
                        lanList.push({ type: "group", roomID: results[i].roomID, users: JSON.parse(JSON.stringify(dernierGroupe)) });
                }
                dernierGroupeId = results[i].roomID;
            }
        }

        //change l'IP en string et envoie à la room correspondante le message.
        var socketIOroom = IP.toString();
        io.to(socketIOroom).emit("lanUsersList", lanList)
        connection.release();
      })
    })
}

//émet la userMap à une room
//@params socket obj le socket du client
//@params roomId int la roomID
function emitUserMap(socket, roomId){
    db.connect();
    db.mySqlClient.getConnection(function(err, connection){
      connection.query("SELECT userID, posX, posY, angle FROM OnlineUsers WHERE roomID = '"+roomId+"'",
      function(err, results){
        if (err) throw err;

        console.log("> emit user map to room  "+ roomId);

        var socketIOroom = roomId;
        io.to(socketIOroom).emit("fullUserMap", results);
        connection.release();
      })
    })
}





server.listen(8081);


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



