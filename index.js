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
let games = [];

const reveal = (data) => {
    let count = 0;
    let sum = 0;
    players.filter(p => p.room == data.room).forEach(p => {
        if (p.vote != null) {
            count++;
            sum += p.vote;
        }
    });
    var result = (count > 0) ? roundPoints(sum / count) : 0;
    io.to(data.room).emit('result', result);
    if (games.findIndex(g => g.room === data.room) > -1){
        var currentGame = games.find(g => g.room === data.room && g.active === true);
        currentGame.points = result;
        io.to(data.room).emit('games', games.filter(g => g.room === data.room));
    }    
    io.to(data.room).emit('reveal', true);
}

io.on("connection", (socket) => {
    socket.on("join_room", (data) => {
        socket.join(data.room);
        
        players.push({
            name: data.user,
            id: socket.id,
            room: data.room,
            vote: null
        });
        
        io.to(data.room).emit("players", players.filter(p => p.room == data.room));
        console.log(buildLog(`User ${data.user} arrived at room ${data.room}`));
        io.to(data.room).emit('games', games.filter(g => g.room === data.room));
    });

    socket.on('addGame', (data) => {
        let nextOrder = games.filter(g => g.room === data.room).length;
        let titles = data.title.split('\n');
        titles.forEach(t => {
            games.push({
                room: data.room,
                title: t, 
                points: 0, 
                active: false, 
                order: nextOrder
            });
            nextOrder++;
        });
        io.to(data.room).emit('games', games.filter(g => g.room === data.room));
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
                reveal(data);
            }
        }
    });

    socket.on('reveal', (data) => {
        reveal(data);
    });

    socket.on('reset', (data) => {
        if (games.findIndex(g => g.room === data.room) > -1) {
            let currentGame = games.find(g => g.room === data.room && g.active === true);
            let nextGameIndex = games.findIndex(g => g.room === currentGame.room && g.order === currentGame.order + 1);
            if (nextGameIndex !== -1) {
                games[nextGameIndex].active = true;
            
                players.filter(p => p.room == data.room).map(p => p.vote = null);
                
                io.to(data.room).emit('players', players.filter(p => p.room == data.room));
                io.to(data.room).emit('reveal', false);
                io.to(data.room).emit('result', '');
                
                currentGame.active = false;
                
                io.to(data.room).emit('games', games.filter(g => g.room === data.room));
            }
        } else {
            players.filter(p => p.room == data.room).map(p => p.vote = null);
            io.to(data.room).emit('players', players.filter(p => p.room == data.room));
            io.to(data.room).emit('reveal', false);
            io.to(data.room).emit('result', '');
        }
    });

    socket.on("clear", (data) => {
        games = games.filter(g => g.room !== data.room);
        io.to(data.room).emit('games', []);
    });

    socket.on("setActive", (data) => {
        currentGame = games.findIndex(g => g.room === data.room && g.active === true);
        if (currentGame > -1) {
            games[currentGame].active = false;
        }        
        newCurrentGame = games.find(g => g.room === data.room && g.title === data.title);
        newCurrentGame.active = true;
        io.to(data.room).emit('games', games.filter(g => g.room === data.room));
    })

    socket.on("disconnect", () => {
        playerDisconnected = players.filter(p => p.id == socket.id);
        if (playerDisconnected.length > 0) {
            console.log(buildLog(`User ${playerDisconnected[0].name} disconnected`));
            players = players.filter(p => p.id != socket.id);
            io.to(playerDisconnected[0].room).emit("players", players.filter(p => p.room == playerDisconnected[0].room));
        }        
    });
});