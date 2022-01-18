const express = require('express');
const socket = require('socket.io');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

const buildLog = (log) => {
    return `${(new Date).toLocaleString()} - ${log}\n`
}

const roundPoints = (value) => {
    if (value === 0) {
        return '0';
    } else if (value <= 1) {
        return '1';
    } else if (value <= 2) {
        return '2';
    } else if (value <= 3) {
        return '3';
    } else if (value <= 6) {
        return '5';
    } else if (value <= 10) {
        return '8';
    } else if (value <= 13) {
        return '13';
    } else {
        return 'Melhor dividir essa tarefa, hein?!';
    }   
}

const server = app.listen(process.env.PORT || 3001, () => {
    console.log(buildLog(`server running on port ${process.env.PORT || 3001}`));
});

io = socket(server);

let players = [];

io.on("connection", (socket) => {
    socket.on("join_room", (data) => {
        socket.join(data.room);
        /*if (room.findIndex(r => r.id == data.room) === -1) {
            console.log(`cria sala ${data.room}`);
        }*/
        players.push({
            name: data.user,
            id: socket.id,
            room: data.room,
            vote: null
        });

        io.to(data.room).emit("players", players.filter(p => p.room == data.room));
        console.log(buildLog(`User ${data.user} arrived at room ${data.room}`));
    });

    socket.on("vote", (data) => {
        if (players.filter(p => p.room == data.room).some(p => p.vote == null)) {
            players.map(p => {
                if (p.id == socket.id) {
                    p.vote = data.value;
                }
            });
            
            io.to(data.room).emit("players", players.filter(p => p.room == data.room));
                        
            if (!players.filter(p => p.room == data.room).some(p => p.vote == null)) {
                io.to(data.room).emit('reveal', true);
                let sum = 0;
                players.filter(p => p.room == data.room).forEach(p => sum += p.vote);
                io.to(data.room).emit('result', roundPoints(sum / players.filter(p => p.room == data.room).length));
            }
        }
    });

    socket.on('reveal', (data) => {
        let count = 0;
        let sum = 0;
        players.filter(p => p.room == data.room).forEach(p => {
            if (p.vote != null) {
                count++;
                sum += p.vote;
            }
        });
        reveal = true;
        io.to(data.room).emit('result', roundPoints(sum / count));
        io.to(data.room).emit('reveal', true);
    });

    socket.on('reset', (data) => {
        players.filter(p => p.room == data.room).map(p => p.vote = null);
        
        io.to(data.room).emit('players', players.filter(p => p.room == data.room));
        io.to(data.room).emit('reveal', false);
        io.to(data.room).emit('result', '');
    });

    socket.on("disconnect", () => {
        playerDisconnected = players.filter(p => p.id == socket.id);
        if (playerDisconnected.length > 0) {
            console.log(buildLog(`User ${playerDisconnected[0].name} disconnected`));
            players = players.filter(p => p.id != socket.id);
            io.to(playerDisconnected[0].room).emit("players", players.filter(p => p.room == playerDisconnected[0].room));
        }        
    });
});