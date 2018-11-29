'use strict';
let express = require('express');

let app = express();
let http = require('http').Server(app);
let io = require('socket.io')(http);

let openRooms = {};

const MAX_SIMULTANEOUS_PACKETS = 25;
const PACKET_SIZE = 1*1024*1024; //1 MB

app.use(express.static('public'));

app.all('/:roomID', function(req, res) {
	let roomID = req.params.roomID;
	if (!roomID) {
		res.sendFile(__dirname + '/public/no_room.html');
		return;
	}

	if (!openRooms[roomID]) {
		res.sendFile(__dirname + '/public/no_room.html');
		return;
	}
	
	let room = openRooms[roomID];

	if (room.client != null) {
		res.sendFile(__dirname + '/public/no_room.html');
		return;
	}

	res.sendFile(__dirname + '/public/transfer.html');
});

http.listen(3000, function() {
	console.log('listening on 3000');
});

io.on('connection', function(socket) {
	socket.on('request-hosting', function(data, cb) {
		if (!cb) return false;
		if (!data.length || !data.name) return false;

		let room = getRoom();
		console.log('created room ' + room);
		
		socket.join(room);
		cb({roomID: room, packetSize: PACKET_SIZE});

		openRooms[room] = {
			roomID: room, 
			host: socket,
			client: null,
			fileName: data.name,
			length: data.length, 
			totalPackets: Math.ceil(data.length / PACKET_SIZE)
		};
	});

	socket.on('request-download', function(data, cb) {
		if (!cb) return false;
		if (!data) return false;

		let room = data.room;
		if (!room) return false;

		console.log('requested to download from room ' + room);

		if (!openRooms[room] || openRooms[room].client != null) {
			console.log('room full');
			return false;
		}

		openRooms[room].client = socket;
		console.log('joined room as client ' + room);
		room = openRooms[room];
		cb({totalPackets: room.totalPackets, name: room.fileName});

		socket.on('init-transfer', function(data) {
			handleTransfer(room);
		})
	});

	socket.on('disconnect', function() {
		console.log('user disconnected');
	});
});

function getRoom() {
  let room = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 5; i++)
    room += possible.charAt(Math.floor(Math.random() * possible.length));

  return room;
}

function handleTransfer(room) {
	let offset = 0;

	for (let i = 0; i < Math.min(MAX_SIMULTANEOUS_PACKETS, room.totalPackets); i++) {
		transferPacket();
	}

	function transferPacket() {
		room.host.emit('get-packet', {offset: offset++}, function(data) {
			room.client.emit('packet', {offset: data.offset, packet: data.packet}, function(data) {
				if (offset < room.totalPackets) {
					transferPacket();
				}
			});
		});
	}
}
