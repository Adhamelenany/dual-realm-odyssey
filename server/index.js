const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// تخزين حالة اللاعبين
const players = new Map();
let roomIdCounter = 1;

io.on('connection', (socket) => {
    console.log('لاعب جديد متصل:', socket.id);
    
    // إنشاء أو الانضمام لغرفة
    socket.on('joinGame', (realm) => {
        // realm: 'light' أو 'shadow'
        const roomId = `room_${roomIdCounter}`;
        
        // إذا كانت الغرفة ممتلئة (لاعبين)، نزيد العداد
        const roomPlayers = Array.from(players.values()).filter(p => p.roomId === roomId);
        if (roomPlayers.length >= 2) {
            roomIdCounter++;
        }
        
        const newRoomId = `room_${roomIdCounter}`;
        socket.join(newRoomId);
        
        players.set(socket.id, {
            id: socket.id,
            realm: realm,
            roomId: newRoomId,
            x: 400,
            y: 300
        });
        
        console.log(`اللاعب ${socket.id} انضم للغرفة ${newRoomId} كـ ${realm}`);
        
        // إعلام اللاعبين الآخرين في الغرفة
        socket.to(newRoomId).emit('playerJoined', {
            id: socket.id,
            realm: realm
        });
    });
    
    // استقبال حركة اللاعب
    socket.on('playerMove', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.x = data.x;
            player.y = data.y;
            
            // إرسال الموقع للاعب الآخر في نفس الغرفة
            socket.to(player.roomId).emit('playerMoved', {
                id: socket.id,
                x: data.x,
                y: data.y
            });
        }
    });
    
    // عند قطع الاتصال
    socket.on('disconnect', () => {
        console.log('لاعب قطع الاتصال:', socket.id);
        const player = players.get(socket.id);
        if (player) {
            socket.to(player.roomId).emit('playerLeft', { id: socket.id });
            players.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`خادم اللعبة يعمل على المنفذ ${PORT}`);
});