/**
 * KRUNKER OFFLINE SERVER - DIRECT PLAY
 * Servidor configurado para iniciar o jogo imediatamente
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const msgpack = require('msgpack-lite');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;
const DEFAULT_MAP = 0; // Burg

// HEADERS ANTI-CACHE & CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', '*');
    // Forçar atualização de scripts (corrigir problema de hook antigo)
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next();
});

app.use(express.static(path.join(__dirname, 'main/krunkerio')));

// Rotas de mapas (explícitas para garantir carregamento)
app.get('/maps/maps_0.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'main/krunkerio/maps/maps_0.json'));
});
app.get('/maps/:mapname.json', (req, res) => {
    const mapname = req.params.mapname;
    res.sendFile(path.join(__dirname, `main/krunkerio/maps/${mapname}.json`));
});

// Rotas principais
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'main/krunkerio/index.html')));
app.get('/launcher', (req, res) => res.sendFile(path.join(__dirname, 'main/krunkerio/launcher.html')));
app.all('/api/*', (req, res) => res.json({ success: true, data: [] }));
app.all('/game-find', (req, res) => res.json({ gameId: "OFFLINE", host: "localhost", port: PORT, clientId: "off" }));
app.all('/game-info', (req, res) => res.json({ gameId: "OFFLINE", host: "localhost", port: PORT, clientId: "off" }));

// WebSocket
wss.on('connection', (ws) => {
    console.log('⚡ Cliente conectado - Iniciando sequência rápida');

    ws.sendPack = (data) => {
        try {
            const encoded = msgpack.encode(data);
            const signature = new Uint8Array([0, 0]);
            const packet = new Uint8Array([...encoded, ...signature]);
            ws.send(Buffer.from(packet));
        } catch (e) { }
    };

    ws.on('message', (message) => {
        try {
            const data = Array.from(msgpack.decode(new Uint8Array(message)));
            const label = data[0];

            if (label === 'po') {
                ws.sendPack(['pir', 1]);
                return;
            }
            if (label === 'etrg' || label === 's') {
                console.log('🎮 Start Request Recieved');
                ws.sendPack(['start', 0, true, false, true]);
            }
        } catch (e) { }
    });

    // Sequência de Inicialização
    ws.sendPack(['pi', null]);
    ws.sendPack(['load', 30000, "offline_id"]);
    ws.sendPack(['io-init', "offline_id"]);

    sendMapInit(ws);

    setTimeout(() => {
        console.log('🚀 Forçando inicio de partida...');
        // Tentar enviar 'start' repetidamente para garantir
        ws.sendPack(['start', 0, true, false, true]);
    }, 1500);

    setInterval(() => {
        if (ws.readyState === ws.OPEN) ws.sendPack(['t', '04:00']);
    }, 1000);
});

function sendMapInit(ws) {
    ws.sendPack([
        "init",
        DEFAULT_MAP,
        0, 0, null, null,
        {
            "gravMlt": 1,
            "jumpMlt": 1,
            "strafeSpd": 1.2,
            "canSlide": true,
            "airStrf": true,
            "autoJump": false,
            "bDrop": false,
            "healthMlt": 1,
            "impulseMlt": 1,
            "nameTags": false,
            "hitBoxPad": 0.6,
            "maps": [0, 1, 2, 3, 4],
            "classes": [0] // Restrição Triggerman
        },
        null, 0, null,
        {
            "bill": { "t": "OFFLINE", "tc": "#fff", "bc": "#000" },
            "obj": [null, 0]
        },
        {}, true, false, false,
        "oid", "sid", 10000
    ]);
}

server.listen(PORT, () => {
    console.log(`🚀 Server Direct-Play rodando em http://localhost:${PORT} (No-Cache Mode)`);
});
