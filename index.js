const express = require('express');
const socket = require('socket.io');
const app = express();
const cors = require('cors');
const fs = require('fs');

var logger = fs.createWriteStream('log.txt', {
    flags: 'a'
  })

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

const server = app.listen(3001, () => {
    console.log('server running on port 3001');
    logger.write(buildLog("server running on port 3001"));
});

io = socket(server);

let players = [];
let reveal = false;

io.on("connection", (socket) => {
    socket.on("join_room", (data) => {
        socket.join(data)
        players.push({
            name: data,
            id: socket.id,
            vote: null
        });

        io.emit("players", players);
        logger.write(buildLog(`User ${data} arrived at room`));
        reveal = false;
        io.emit("reveal", reveal);
        io.emit('result', '');
    });

    socket.on("vote", (value) => {
        if (!reveal) {
            players.map(p => {
                if (p.id == socket.id) {
                    p.vote = value;
                }
            });
            
            io.emit("players", players);
                        
            if (!players.some(p => p.vote == null)) {
                reveal = true;
                let sum = 0;
                players.forEach(p => sum += p.vote);
                io.emit('result', roundPoints(sum / players.length));
                io.emit("reveal", reveal);
            }
        }
    });

    socket.on('reveal', () => {
        let count = 0;
        let sum = 0;
        players.forEach(p => {
            if (p.vote != null) {
                count++;
                sum += p.vote;
            }
        });
        reveal = true;
        io.emit('result', roundPoints(sum / count));
        io.emit('reveal', reveal);
    })

    socket.on('reset', () => {
        players.map(p => p.vote = null);
        reveal = false;
        io.emit('players', players);
        io.emit('reveal', reveal);
        io.emit('result', '');
    });

    socket.on("disconnect", () => {
        playerDisconected = players.filter(p => p.id == socket.id);
        if (playerDisconected.length > 0)
            logger.write(buildLog(`User ${playerDisconected[0].name} disconnected`));
        players = players.filter(p => p.id != socket.id);
        io.emit("players", players);
        
    })
});