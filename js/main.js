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
	
	// ne marchera pas sur ton ordi, mais c'est juste pour que tu saches

	// var socket = io.connect('http://127.0.0.1:8081');
	var socket = io.connect('http://141.138.157.239:8081');

	var pos = parseInt(prompt('Quel est votre position sur la rangée (de gauche à droite) ?',''));
	
	$('#pos span').text(pos);
	
	socket.emit('setPos',pos);

	function gauche(msg)
	{
		socket.emit('send',{to: pos-1, msg: msg});
	}

	function droite(msg)
	{
		socket.emit('send',{to: pos+1, msg: msg});
	}

	socket.on('get',function(data) {
		$('#receiver').text(data.msg);
		if (pos>data.from)
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
	
	$('#gauche').click(function(){});
	$('#droite').click(function(){ droite($('textarea').val()); });
	
});