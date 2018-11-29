let socket = io();
let roomURLSeg = window.location.href.match(/[^\/]+$/)[0];

document.getElementById('receiveButton').disabled = true;

socket.emit('request-download', {room: roomURLSeg}, function(data) {
	let packets = [];
	let total = data.totalPackets;
	let fileName = data.name;

	document.getElementById('receiveButton').disabled = false;
	document.getElementById('receiveButton').addEventListener('click', function() {
		socket.emit('init-transfer');
	}, false);

	socket.on('packet', function(packet, acknowledge) {
		packets[packet.offset] = packet.packet;
		console.log(packet.offset, total, packets.length);
		acknowledge();

		if (packets.length == total) {
			console.log('checking if finished');
			let finished = true;
			for (let i = 0; i < total; i++) {
				if (packets[i] == null || packets[i] == undefined) {
					finished = false;
				}
			}
			if (finished) {
				finish(packets.join(""), fileName);
			}
		}
	});
});

function finish(string, name) {
	let link = document.createElement("a");
  let blob = dataURLtoBlob(string);
  let objUrl = URL.createObjectURL(blob);

  link.download = name; //TODO: Get original name
  link.href = objUrl;
  link.click();
}

function dataURLtoBlob(dataurl) {
    let arr = dataurl.split(',');
    let mime = arr[0].match(/:(.*?);/)[1];
    let bstr = atob(arr[1]); 
    let n = bstr.length;
    let u8arr = new Uint8Array(n);
    
    while (n--) {
    	if (n%1000 == 0) console.log(n);
    	u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], {type:mime});
}
