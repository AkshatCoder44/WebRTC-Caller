// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 9000;
const allUsers = {};

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    console.log("GET Request /");
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle socket connections
io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User joins with a username
    socket.on("join-user", (username) => {
        console.log(`${username} joined`);
        allUsers[username] = { username, id: socket.id };
        console.log(allUsers)
        // Notify all clients
        io.emit("joined", allUsers);
    });

    // Handle offer
    socket.on("offer", ({ from, to, offer }) => {
        if (allUsers[to]) {
            io.to(allUsers[to].id).emit("offer", { from, to, offer });
            // console.log({from, to, offer})
        }
    });

    // Handle answer
    socket.on("answer", ({ from, to, answer }) => {
        if (allUsers[from]) {
            io.to(allUsers[from].id).emit("answer", { from, to, answer });
            // console.log({from, to, answer})
        }
    });

    // Handle ICE candidate
    socket.on("icecandidate", ({ to, candidate, from }) => {
        if (allUsers[to]) {
            io.to(allUsers[to].id).emit("icecandidate", { from, candidate });
            console.log({from, to, candidate})
        }
    });

    // End call
    socket.on("end-call", ({ from, to }) => {
        if (allUsers[to]) {
            io.to(allUsers[to].id).emit("end-call", { from, to });
        }
    });

    // Call ended notification
    socket.on("call-ended", ([from, to]) => {
        if (allUsers[from]) io.to(allUsers[from].id).emit("call-ended", [from, to]);
        if (allUsers[to]) io.to(allUsers[to].id).emit("call-ended", [from, to]);
    });

    // Handle disconnect
    socket.on("disconnect", () => {
        for (const username in allUsers) {
            if (allUsers[username].id === socket.id) {
                console.log(`${username} disconnected`);
                delete allUsers[username];
                break;
            }
        }
        io.emit("joined", allUsers); // update clients
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
