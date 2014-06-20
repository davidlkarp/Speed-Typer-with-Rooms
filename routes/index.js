// to do list: 
//chat functionality
//bootstrap it
//extra word banks, toggleable
//uppload & refactor
//diploy?

module.exports = function Route(app){
	var global_users = []; // only for disconnect
	var rooms = [];
	var users = {};
	// var word_banks = {};
	var testing_bank = ['test', 'javascript', 'terminal', 'zebra', 'microwave', 'your mom', 'beta tester', 'black belt', 'ninja', 'samurai', 'ruby on rails', 'russia', 'california', 'washington', 'czechoslovakia', 'horse', 'monster', 'tea', 'granite', 'peanut butter', 'obama', 'grilled cheese', 'earthquake', 'sweet tea']

// renders index
  app.get('/', function(req, res){
    res.render('index', {room:'Welome Page'});
  });
//renders the room
  app.get('/room', function(req, res){
    res.render('room', {room: req.session.room, player: req.session.name });
  });
//receives post from index containing name and room, saves to session, redirects
  app.post('/process', function(req, res){
    console.log('POST INFO', req.body); //post is stored in req.body
    req.session.name = req.body.name;
    req.session.room = req.body.room;
    req.session.sessionID = req.sessionID; //unique sessionID for the user
    req.session.save(function() {
       res.redirect('room');
    });

  });

//on ready emit, join a room. check if room exists, if not, push new room to rooms array and create and push users list for room (room_users)
  app.io.route('ready', function(req) {
	req.io.join(req.session.room);
	// console.log(rooms);
	// console.log(rooms[0]);
	// console.log(rooms.length);
	for(var i=0; i<rooms.length; i++){
		if(rooms[i].name == req.session.room ){
			var room_already_created = true;
		};
	};
	console.log('room already created:', room_already_created)
	if(room_already_created !== true ){
		rooms.push( { name: req.session.room, count: 20, word: 'supercalifragilisticexpialidocious', big_count: 0 } );

		console.log('room name + count:', rooms[0].name + " " + rooms[0].count);
		
		users[req.session.room] = [];
		users[req.session.room].push( { name: req.session.name, id: req.socket.id, score: 0, round_score: 0 } );

		global_users.push( { name: req.session.name, id: req.socket.id, room: req.session.room, } );

		// console.log('global users:', global_users);
		// console.log('gl0:', global_users[0])
		// console.log('gl room:', global_users[0].id)
		
		room_already_created = true; 
		Timer(req); // timer function
	} else {
		users[req.session.room].push( { name: req.session.name, id: req.socket.id, score: 0, round_score: 0 } );
		global_users.push( { name: req.session.name, id: req.socket.id, room: req.session.room, } );
	};

	app.io.room(req.session.room).broadcast('new_user', { message: req.session.name + ' has joined the ' + req.session.room + ' room. '} );
	app.io.room(req.session.room).broadcast('user_update', { userlist: users[req.session.room]  });
	//debug
	// console.log("req.session.room: ",  req.session.room);
	// console.log("users in room: ", users[req.session.room])
	// console.log("users: ", users)
	// console.log("users name: ", users[req.session.room][0].name) // important
  });

	function Timer(req)
	{	
		for (var i = 0; i < rooms.length; i++) {
			if(rooms[i].name == req.session.room){
				var position_i = i;
			} 
		};

		setInterval(function()
		{
			//countdown interval
			setTimeout(function(){
				var count = rooms[position_i].count;
				rooms[position_i].big_count = count;
				var myinterval = setInterval(function()
				{
					count -= 1;
					rooms[position_i].big_count = count;
					if (count > 0){
						app.io.room(req.session.room).broadcast('countdown', { count: count } );
						console.log('countdown ' + count );
					} else {
						clearInterval(myinterval);
					};
				}, 1000);
			}, 10000)
		}, 30000);

		//word change interval
		setInterval(function(){
			rooms[position_i].word = testing_bank[(Math.floor(Math.random()*testing_bank.length))];
			app.io.room(req.session.room).broadcast('new_word', { word: rooms[position_i].word } );

			console.log('new word broadcast ');
		}, 30000);

		//score update every second
		setInterval(function(){
			app.io.room(req.session.room).broadcast('user_update', { userlist: users[req.session.room]  } );
		}, 1000);

		//round score update every 30 seconds
		setInterval(function(){
			for(var i=0; i<users[req.session.room].length; i++){
				users[req.session.room][i].round_score = 0;
			};
		}, 30000);	
	};

	app.io.route('answerAttempt', function(req){
		for (var i = 0; i < rooms.length; i++) {
			if(rooms[i].name == req.session.room){
				var position_i = i;
			} 
		};
		// console.log(req.data[0].value, rooms[position_i].word, rooms[position_i].big_count)
		if (req.data[0].value == rooms[position_i].word && rooms[position_i].big_count == 0){
			req.io.emit('answerValidation', { verdict: "Correct" } );
				for(var i=0; i<users[req.session.room].length; i++){
					if(users[req.session.room][i].id == req.socket.id){
						users[req.session.room][i].score += 1;
						users[req.session.room][i].round_score += 1;
						req.io.emit('myScoreUpdate', { score: users[req.session.room][i].score, round_score: users[req.session.room][i].round_score } );
					};
				};
		} else {
			req.io.emit('answerValidation', { verdict: "Incorrect" } );
		};
	});	

	app.io.route('disconnect', function(req)
	{
		// ?? store all users in global variable using socket id and store their room name there, then, on diconnect search entire global variable for that socket id, find the roomname, then use roomname to search dynamic users object ?? 
		for(var i=0; i < global_users.length; i++){
			if (global_users[i].id == req.socket.id){
				// console.log(global_users[i].id + " " + global_users[i].name + " " + global_users[i].room);
				var room_disconnect = global_users[i].room;
				// console.log('1', room_disconnect);
				// console.log('2', users[room_disconnect][0]);
				// console.log('3', users[room_disconnect].length);
				for(var i=0; i < users[room_disconnect].length; i++){
					if(users[room_disconnect][i].id == req.socket.id){
						var POSTER = users[room_disconnect][i].name;
						var temp = users[room_disconnect][i];
						users[room_disconnect][i] = users[room_disconnect][(users.length-1)];
						users[room_disconnect][(users.length-1)] = temp;
						users[room_disconnect].pop();

						app.io.room(req.session.room).broadcast('disconnected', { name: POSTER } );
					};
				};
				var g_temp = global_users[i];
				global_users[i] = global_users[global_users.length-1];
				global_users[global_users.length-1] = g_temp;
				global_users.pop();
			};
		};
		console.log('Disconnected ' + req.socket.id );
	});


	app.io.route('new_message', function(req) 
	{
		for(var i=0; i<users[req.session.room].length; i++){
			if(users[req.session.room][i].id == req.socket.id){
				var POSTER = users[req.session.room][i].name
			}
		}
		app.io.room(req.session.room).broadcast('update', { message: req.data[0].value, name: POSTER } );
		console.log("message sent" + req.data[0].value + POSTER);
	});


  	


};