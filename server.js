const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const msgpack = require('msgpack-lite');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// Mapas disponíveis
const MAPS = {
    burg: 0,
    littletown: 1,
    sandstorm: 2,
    subzero: 3,
    kanji: 4
};

let currentMapIndex = MAPS.kanji;
let CURRENT_GAME_TIME = (4 * 60) - 1;

// CORS headers para permitir requisições do jogo
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Parse JSON
app.use(express.json());

// ==========================================
// MATCHMAKER API - Simula matchmaker.krunker.io
// ==========================================
app.post('/game-find', (req, res) => {
    console.log('🎯 Matchmaker: game-find request');
    res.json({
        changeReason: null,
        gameId: "OFFLINE:Local",
        host: req.get('host').split(':')[0],
        port: parseInt(PORT),
        clientId: "offline-" + Date.now()
    });
});

app.post('/game-info', (req, res) => {
    console.log('🎯 Matchmaker: game-info request');
    res.json({
        changeReason: null,
        gameId: "OFFLINE:Local",
        host: req.get('host').split(':')[0],
        port: parseInt(PORT),
        clientId: "offline-" + Date.now()
    });
});

app.get('/ping', (req, res) => {
    res.json({ ping: 0 });
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'main/krunkerio')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/krunkerio/index.html'));
});

// ==========================================
// WEBSOCKET - Servidor de jogo
// ==========================================
wss.on('connection', (ws, req) => {
    console.log('=> WebSocket connected from:', req.socket.remoteAddress);

    ws.sendToWs = (array) => {
        try {
            let packet = new Uint8Array(array);
            let padding = 2;
            let signature = packet.slice(-padding);
            ws.send(Buffer.from(Uint8Array.from([...msgpack.encode(array), ...signature])));
        } catch (e) {
            console.error('Send error:', e);
        }
    };

    ws.on('message', (message) => {
        try {
            const data = Array.from(msgpack.decode(new Uint8Array(message)));
            const label = data[0];

            if (label !== "i" && label !== "a" && label !== "po") {
                console.log('📥 Received:', label, data.slice(1));
            }

            if (label === "po") {
                ws.sendToWs(["pir", 1]);
                setTimeout(() => {
                    ws.sendToWs(['pi', null]);
                }, 5000);
                return;
            }

            if (label === "etrg") {
                console.log('🎮 Game start triggered!');
                ws.sendToWs(['start', 0, true, false, true]);
                return;
            }
        } catch (e) {
            console.error('Message error:', e);
        }
    });

    ws.on('error', console.error);

    // Inicializar conexão
    ws.ID = makeid(5);
    console.log('📤 Sending init packets...');

    ws.sendToWs(['pi', null]);
    ws.sendToWs(['load', 20000, ws.ID]);
    ws.sendToWs(['io-init', ws.ID]);
    sendLoadMap(ws, currentMapIndex);

    // Timer do jogo
    const timerInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.sendToWs(['t', parseTimeString(CURRENT_GAME_TIME)]);
            if (CURRENT_GAME_TIME > 0) {
                CURRENT_GAME_TIME--;
            } else {
                CURRENT_GAME_TIME = (4 * 60) - 1;
            }
        } else {
            clearInterval(timerInterval);
        }
    }, 1000);

    ws.on('close', () => {
        clearInterval(timerInterval);
        console.log('=> WebSocket disconnected');
    });
});

function parseTimeString(time) {
    let minutes = parseInt(time / 60);
    let seconds = time - (60 * minutes);
    if (seconds < 10) { seconds = "0" + seconds.toString(); }
    return `0${minutes}:${seconds}`;
}

function makeid(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function sendLoadMap(ws, id) {
    console.log('📤 Sending map init packet for map:', id);
    ws.sendToWs([
        "init",
        id || 4,
        0,
        0,
        null,
        null,
        {
            "cost": 0,
            "deltaMlt": 1,
            "maxPlayers": 2,
            "minPlayers": 0,
            "gameTime": 4,
            "warmupTime": 0,
            "gamRounds": 1,
            "intermTmr": 30,
            "forceSpawn": 0,
            "lives": 0,
            "scoreLimit": 0,
            "keepTScore": false,
            "objtvTime": 1,
            "forceC": true,
            "logTim": true,
            "lstChkT": false,
            "gravMlt": 1,
            "fallDmg": 0,
            "fallDmgThr": 0,
            "jumpMlt": 1,
            "fixMov": false,
            "slidTime": 1,
            "slidSpd": 1,
            "impulseMlt": 1,
            "wallJP": 1,
            "strafeSpd": 1.2,
            "canSlide": true,
            "airStrf": false,
            "autoJump": false,
            "bDrop": false,
            "healthMlt": 1,
            "hitBoxPad": 0.6,
            "fiRat": 1,
            "reSpd": 1,
            "hpRegen": true,
            "killRewards": true,
            "headshotOnly": false,
            "noSecondary": false,
            "noStreaks": false,
            "disableB": false,
            "throwMel": true,
            "chrgWeps": true,
            "selTeam": false,
            "frFire": false,
            "nameTeam1": "Team 1",
            "nameTeam2": "Team 2",
            "nameTeam3": "Team 3",
            "nameTeam4": "Team 4",
            "nameTeam5": "Team 5",
            "t1Dmg": 1,
            "t2Dmg": 1,
            "t3Dmg": 1,
            "t4Dmg": 1,
            "t5Dmg": 1,
            "allowSpect": true,
            "thirdPerson": false,
            "nameTags": false,
            "nameTagsFR": false,
            "kCams": true,
            "aAnon": true,
            "specSlots": 2,
            "tmSize": 3,
            "noCosm": false,
            "tstCmp": false,
            "limitClasses": 0,
            "noDraws": false,
            "bstOfR": false,
            "headClipFix": false,
            "maxPS": false,
            "promServ": false,
            "maps": [0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 19, 21, 22, 23, 24, 25, 26, 28],
            "modes": null,
            "classes": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15]
        },
        null,
        0,
        null,
        {
            "gor": 1,
            "lockT": 0,
            "roundC": 0,
            "bill": {
                "t": "KRUNKER OFFLINE MODE",
                "tc": "#e3e3e3",
                "bc": "#000000"
            },
            "zone": 0,
            "lck": 0,
            "obj": [null, 0],
            "pwup": [0, 0, 0],
            "flg": [
                [523, -198, 41, -233, 0, null],
                [525, 249, 24, 209, 0, null],
                [544, -153, 32, 241, 0, null]
            ],
            "dest": [539, 541]
        },
        {},
        true,
        false,
        false,
        "offline-game-id-" + makeid(8),
        "offline-session-" + makeid(8),
        193300
    ]);
}

// API para trocar mapa
app.get('/api/map/:id', (req, res) => {
    const mapId = parseInt(req.params.id);
    if (mapId >= 0 && mapId <= 4) {
        currentMapIndex = mapId;
        res.json({ success: true, map: mapId });
    } else {
        res.json({ success: false, message: 'Invalid map ID (0-4)' });
    }
});

server.listen(PORT, () => {
    console.log(`🎮 Krunker Offline Server running on port ${PORT}`);
    console.log(`   Open http://localhost:${PORT} to play`);
    console.log(`   WebSocket ready on the same port`);
});
