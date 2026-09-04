(function() {
    console.log("🛠️ Hook Standalone v7 (Servidor Virtual Completo em Memória) inicializado...");

    function fixUrl(url) {
        if (typeof url === 'string' && url.startsWith('/')) {
            return '.' + url;
        }
        return url;
    }

    // 1. Interceptar Elementos de Imagem
    const originalImageSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (originalImageSrcDescriptor && originalImageSrcDescriptor.set) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            get: function() {
                return originalImageSrcDescriptor.get.call(this);
            },
            set: function(val) {
                originalImageSrcDescriptor.set.call(this, fixUrl(val));
            },
            configurable: true
        });
    }

    // 2. Interceptar Fetch e XHR
    const originalFetch = window.fetch;
    window.fetch = function(resource, init) {
        return originalFetch.call(this, fixUrl(resource), init);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        return originalOpen.call(this, method, fixUrl(url), ...rest);
    };

    // 3. Empacotador de pacotes msgpack
    function encodePacket(array) {
        if (window.msgpack && window.msgpack.encode) {
            let encoded = window.msgpack.encode(array);
            let padding = new Uint8Array([0, 0]);
            let result = new Uint8Array(encoded.length + 2);
            result.set(encoded, 0);
            result.set(padding, encoded.length);
            return result.buffer;
        }
        return new Uint8Array(0).buffer;
    }

    // 4. WebSocket Virtual In-Browser para simular gameserver.js
    class BrowserVirtualWebSocket {
        constructor(url) {
            console.log("🔌 Conectando ao Servidor Virtual em Memória:", url);
            this.readyState = 1; // OPEN
            this.bufferedAmount = 0;
            this.onopen = null;
            this.onmessage = null;
            this.onerror = null;
            this.onclose = null;

            setTimeout(() => {
                if (this.onopen) this.onopen({ type: 'open' });
                this.sendInitPackets();
            }, 100);
        }

        sendToClient(packetArray) {
            if (this.onmessage) {
                const buffer = encodePacket(packetArray);
                this.onmessage({ data: buffer });
            }
        }

        sendInitPackets() {
            const wsID = 'web_' + Math.random().toString(36).substring(2, 7);
            
            this.sendToClient(['pi', null]);
            this.sendToClient(['load', 20000, wsID]);
            this.sendToClient(['io-init', wsID]);

            // Pacote de Inicialização do Mapa (Burg - ID 0)
            this.sendToClient([
                "init",
                0,
                0, 0, null, null,
                {
                    "cost": 0, "deltaMlt": 1, "maxPlayers": 2, "minPlayers": 0,
                    "gameTime": 4, "warmupTime": 0, "gamRounds": 1, "intermTmr": 30,
                    "forceSpawn": 0, "lives": 0, "scoreLimit": 0, "keepTScore": false,
                    "objtvTime": 1, "forceC": true, "logTim": true, "lstChkT": false,
                    "gravMlt": 1, "fallDmg": 0, "fallDmgThr": 0, "jumpMlt": 1,
                    "fixMov": false, "slidTime": 1, "slidSpd": 1, "impulseMlt": 1,
                    "wallJP": 1, "strafeSpd": 1.2, "canSlide": true, "airStrf": false,
                    "autoJump": false, "bDrop": false, "healthMlt": 1, "hitBoxPad": 0.6,
                    "fiRat": 1, "reSpd": 1, "hpRegen": true, "killRewards": true,
                    "headshotOnly": false, "noSecondary": false, "noStreaks": false,
                    "disableB": false, "throwMel": true, "chrgWeps": true, "selTeam": false,
                    "frFire": false, "nameTeam1": "Team 1", "nameTeam2": "Team 2",
                    "allowSpect": true, "thirdPerson": false, "nameTags": false,
                    "kCams": true, "aAnon": true, "specSlots": 2, "tmSize": 3,
                    "maps": [0, 1, 2, 3, 4],
                    "modes": null,
                    "classes": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15]
                },
                null, 0, null,
                {
                    "gor": 1, "lockT": 0, "roundC": 0,
                    "bill": { "t": "KRUNKER OFFLINE PAGES", "tc": "#e3e3e3", "bc": "#000000" },
                    "zone": 0, "lck": 0,
                    "obj": [null, 0], "pwup": [0, 0, 0],
                    "flg": [[523, -198, 41, -233, 0, null], [525, 249, 24, 209, 0, null]],
                    "dest": [539, 541]
                },
                {}, true, false, false,
                "e466edb1-8bc4-41d7-9c0e-5968ab47b369",
                "a10417ad-d10e-447e-90b1-8e1b116ace6d",
                193300
            ]);

            setInterval(() => {
                this.sendToClient(['t', '03:59']);
            }, 1000);
        }

        send(data) {
            if (this.onmessage && window.msgpack) {
                try {
                    let decoded = window.msgpack.decode(new Uint8Array(data));
                    let label = decoded[0];
                    if (label === 'etrg') {
                        this.sendToClient(['start', 0, true, false, true]);
                    }
                    if (label === 'po') {
                        this.sendToClient(['pir', 1]);
                    }
                } catch(e) {}
            }
        }

        close() {
            this.readyState = 3;
            if (this.onclose) this.onclose({ type: 'close' });
        }

        addEventListener(type, listener) {
            if (type === 'message') this.onmessage = listener;
            if (type === 'open') this.onopen = listener;
            if (type === 'close') this.onclose = listener;
            if (type === 'error') this.onerror = listener;
        }
    }

    if (!window.process || !window.process.versions || !window.process.versions.electron) {
        window.WebSocket = BrowserVirtualWebSocket;
    }
})();
