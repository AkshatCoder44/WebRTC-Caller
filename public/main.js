// DOM Elements
var createUserBtn = document.getElementById("create-user");
var username = document.getElementById("username");
var allusersHtml = document.getElementById("allusers");
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");
var endCallBtn = document.getElementById("end-call-btn");

// Socket and Media
var socket = io();
var localStream;
var peerConnection = null;
var caller = [];

// ----------------------------
// PEER CONNECTION
// ----------------------------
function createPeerConnection(localStream, remoteVideo, socket) {
    var config = {
        iceServers: [
            {
                urls: 'stun:stun.l.google.com:19302'
            }
        ]
    };

    var pc = new RTCPeerConnection(config);

    // Add local tracks
    localStream.getTracks().forEach(function(track) {
        pc.addTrack(track, localStream);
    });

    // Remote stream handling
    pc.ontrack = function(event) {
        remoteVideo.srcObject = event.streams[0];
    };

    // ICE candidate handling
    pc.onicecandidate = function(event) {
        if (event.candidate) {
            socket.emit("icecandidate", event.candidate);
        }
    };

    return pc;
}

// ----------------------------
// EVENT LISTENERS
// ----------------------------
createUserBtn.addEventListener("click", function() {
    if (username.value !== "") {
        var usernameContainer = document.querySelector(".username-input");
        socket.emit("join-user", username.value);
        usernameContainer.style.display = 'none';
    }
});

endCallBtn.addEventListener("click", function() {
    socket.emit("call-ended", caller);
});

// ----------------------------
// SOCKET EVENTS
// ----------------------------
socket.on("joined", function(allusers) {
    updateUsersList(allusers);
});

socket.on("offer", async function(data) {
    var from = data.from;
    var to = data.to;
    var offer = data.offer;

    if (!peerConnection) {
        peerConnection = createPeerConnection(localStream, remoteVideo, socket);
    }

    await peerConnection.setRemoteDescription(offer);
    var answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit("answer", { from: from, to: to, answer: peerConnection.localDescription });
    caller = [from, to];
});

socket.on("answer", async function(data) {
    var answer = data.answer;
    var from = data.from;
    var to = data.to;

    if (!peerConnection) return;

    await peerConnection.setRemoteDescription(answer);
    endCallBtn.style.display = 'block';
    socket.emit("end-call", { from: from, to: to });
    caller = [from, to];
});

socket.on("icecandidate", async function(candidate) {
    if (!peerConnection) return;
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on("end-call", function(data) {
    endCallBtn.style.display = "block";
});

socket.on("call-ended", function() {
    endCall();
});

// ----------------------------
// FUNCTIONS
// ----------------------------
function startCall(user) {
    if (!peerConnection) {
        peerConnection = createPeerConnection(localStream, remoteVideo, socket);
    }

    peerConnection.createOffer().then(function(offer) {
        return peerConnection.setLocalDescription(offer).then(function() {
            socket.emit("offer", {
                from: username.value,
                to: user,
                offer: peerConnection.localDescription
            });
        });
    });
}

function endCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
        endCallBtn.style.display = 'none';
    }
}

function updateUsersList(allusers) {
    allusersHtml.innerHTML = "";

    for (var user in allusers) {
        var li = document.createElement("li");
        li.textContent = user + (user === username.value ? " (You)" : "");

        if (user !== username.value) {
            var button = document.createElement("button");
            button.classList.add("call-btn");
            button.addEventListener("click", function(u) {
                return function() {
                    startCall(u);
                };
            }(user));

            var img = document.createElement("img");
            img.setAttribute("src", "https://raw.githubusercontent.com/Rizwan17/webrtc-video-calling-app/refs/heads/main/public/images/phone.png");
            img.setAttribute("width", 20);
            button.appendChild(img);
            li.appendChild(button);
        }

        allusersHtml.appendChild(li);
    }
}

function startMyVideo() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: true })
        .then(function(stream) {
            localStream = stream;
            localVideo.srcObject = stream;
        })
        .catch(function(error) {
            console.error("Error accessing media devices.", error);
        });
}

// ----------------------------
// INITIALIZE
// ----------------------------
startMyVideo();
