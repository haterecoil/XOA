// Version que j'ai modifiée dans la branche dev
$(document).ready(function(){
 
   
        var ttg = $('#textarea');
       
        ttg.draggable({
                axis: 'x',
                handle: '#handle',
                accept: '#left, #right',
                containment: 'body',
                revert : true      
        });
 
         $( "#left" ).droppable({
        accept:"#textarea",
          activeClass: "ui-state-default",
          hoverClass: "ui-state-hover",
          tolerance: 'touch',
          over: function( event, ui) {  },
          drop: function( event, ui ) {
                        gauche($('textarea').val());
          }
        });
 
        $( "#right" ).droppable({
        accept:"#textarea",
          activeClass: "ui-state-default",
          hoverClass: "ui-state-hover",
          tolerance: 'touch',
          over: function( event, ui) {  },
          drop: function( event, ui ) {
                        droite($('textarea').val());
          }
        });
       


        var socket = io.connect('http://127.0.0.1:8081');
        //var socket = io.connect('http://141.138.157.242:8081');
 
        var x = parseInt(prompt('x?',''));
        var y = parseInt(prompt('y?',''));
        var name = prompt('nom ?', '');
       
        $('#pos span').text(x+ ' '+y);
       
        socket.emit('setMyPos',{x: x, y: y});
        socket.emit('setUser', { 'newUser' : name });

        // @param data = { relX, relY, message }
        function gauche(msg) { socket.emit('send',{relX: -1, relY: 0, message: msg}); }
        function droite(msg) { socket.emit('send',{relX: 1, relY: 0, message: msg}); }
       
       
 
        socket.on('message',function(data) {
        	console.log('message');
                $('#receiver').text(data.message);
                if (relX<0)
                {
                        $('#receiver').css('left','-500px').animate({left: 0}, 1000, 'easeOutCubic');
                }
                else
                {
                        $('#receiver').css('left','500px').animate({left: 0}, 1000, 'easeOutCubic');
                }
                // utiliser data.pos (la différence entre notre pos et celle de l'émetteur) pour savoir si ça vient de gauche ou droite
                // @idée, si on passe de pos 4 à pos 6, le texte traverse l'écran de pos 5
        });
       
        $('#send').click(function(){
                var relX = parseInt(prompt('relX ?'));
                var relY = parseInt(prompt('relY ?'));
               
                socket.emit('send',{relX: relX, relY: relY, message: $('textarea').val()});
        });
       
        $('#gauche').click(function(){});
        $('#droite').click(function(){ droite($('textarea').val()); });
       
});