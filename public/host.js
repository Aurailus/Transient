let socket = io();
let currentFiles = [];
let fileDetails = [];
let urlFrag = "localhost:3000";

document.getElementById('uploadButton').disabled = true;

function handleFiles(e) {
	let files = e.target.files;

	if (files.length != 0) {
		document.getElementById('files_list').innerHTML = '';
		currentFiles = [];
		fileDetails = [];
		
		for (let i = 0, f; f = files[i]; i++) {

			let friendlySize = f.size;
			let sizeUnit = "bytes";
			if (friendlySize > 512) {
				friendlySize /= 1024;
				sizeUnit = "KB";
			}
			if (friendlySize > 512) {
				friendlySize /= 1024;
				sizeUnit = "MB";
			}
			if (friendlySize > 512) {
				friendlySize /= 1024;
				sizeUnit = "GB";
			}
			friendlySize = Math.round(friendlySize*10)/10;

			let element = document.createElement('div');
			element.innerHTML = 
			'<div class="file">' +
				'<p class="file_title">' + htmlspecialchars(f.name) + '</p>' +
				'<p class="data">MIME Type: ' + (f.type || 'n/a') + ' &bullet; Size: ' + friendlySize + ' ' + sizeUnit + '.</p>' +
				'<div class="progress"></div>' +
			'</div>';
			element = element.firstElementChild;

			currentFiles.push({ handle: f, element: element });
			fileDetails.push({
				name: htmlspecialchars(f.name), 
				size: f.size, 
				sizeString: friendlySize + " " + sizeUnit,
				type: f.type,
			});
			
			document.getElementById('files_list').appendChild(element);

			// let progress = 0;
			// setInterval(function() { element.querySelector('.progress').style.cssText = ("width: " + (progress++) + "%"); }, 200);
		}
	}		
	
	document.getElementById('uploadButton').disabled = currentFiles.length == 0;
}

document.getElementById('upload').addEventListener('change', handleFiles, false);

function uploadFiles(e) {
	let button = document.getElementById('uploadButton');
	button.disabled = true;
	document.getElementById('upload').disabled = true;
	document.querySelector('.file_upload').classList.add('disabled');

	let file = currentFiles[0];
	let reader = new FileReader();
	reader.onload = loadedFile;
	reader.readAsDataURL(file.handle);

	function loadedFile(e) {
		let fileString = e.target.result;

		socket.emit('request-hosting', {name: htmlspecialchars(file.handle.name), length: fileString.length}, function(data) {
			let roomID = data.roomID;
			let packetSize = data.packetSize;

			button.parentNode.removeChild(button);
			document.getElementById("footerWrapper").innerHTML += "<input type='text' class='link' id='shareLink' spellcheck='false' value='" 
				+ urlFrag + "/" + roomID + "'/>";
			document.getElementById('shareLink').focus();
			document.getElementById('shareLink').select();

			socket.on('get-packet', function(data, cb) {
				let stringStart = data.offset * packetSize;
				let stringEnd = Math.min(stringStart + packetSize, fileString.length);
				let packet = {
					offset: data.offset,
					packet: fileString.substring(stringStart, stringEnd),
				}
				cb(packet);
				file.element.querySelector('.progress').style.cssText = ("width: " + (stringEnd / fileString.length * 100) + "%");
			});
		});

	}
}

document.getElementById('uploadButton').addEventListener('click', uploadFiles, false);

function htmlspecialchars(str) {
  var map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;" // ' -> &apos; for XML only
  };
  return str.replace(/[&<>"']/g, function(m) { return map[m]; });
}
