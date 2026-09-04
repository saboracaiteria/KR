// WEBSOCKET & CONFIG HOOK V7 (Full Standalone In-Memory WebSocket + GitHub Pages Compatible)
(function () {
    // ============================================================
    // FUNÇÃO CENTRAL DE CORREÇÃO DE URL (usada em TODOS os interceptores)
    // Corrige URLs relativas (/textures/...) E absolutas (https://saboracaiteria.github.io/textures/...)
    // ============================================================
    const _ghPagesOrigin = window.location.origin; // ex: https://saboracaiteria.github.io
    const _basePath = (function() {
        // Extrai o prefixo do caminho da página atual ex: /KR/main/krunkerio/
        const parts = window.location.pathname.split('/');
        // Remove o arquivo index.html se existir
        if (parts[parts.length - 1].includes('.')) parts.pop();
        return parts.join('/') + '/';
    })();

    function fixUrl(url) {
        if (typeof url !== 'string') return url;
        // URL absoluta apontando para a raiz do domínio (ex: https://saboracaiteria.github.io/textures/...)
        if (url.startsWith(_ghPagesOrigin + '/') && !url.startsWith(_ghPagesOrigin + _basePath)) {
            const path = url.slice(_ghPagesOrigin.length); // ex: /textures/recticle.png
            return _ghPagesOrigin + _basePath + path.slice(1); // => /KR/main/krunkerio/textures/recticle.png
        }
        // URL relativa à raiz (ex: /textures/..., /models/...)
        if (url.startsWith('/') && !url.startsWith('//')) {
            return '.' + url;
        }
        return url;
    }

    // INTERCEPTAR IMAGE SRC
    const originalImageSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (originalImageSrcDescriptor && originalImageSrcDescriptor.set) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
            get: function() { return originalImageSrcDescriptor.get.call(this); },
            set: function(val) { originalImageSrcDescriptor.set.call(this, fixUrl(val)); },
            configurable: true
        });
    }

    console.log('🎮 Ativando Hook Standalone v6...');

    // 0. FORÇAR CRIAÇÃO DE CONFIGURAÇÃO VÁLIDA
    try {
        let settings = localStorage.getItem('krunker_settings');
        if (!settings || settings === '{}') {
            localStorage.setItem('krunker_settings', JSON.stringify({
                resolution: 1,
                fov: 90,
                fpsDisplay: true,
                speedOff: false
            }));
        }
        localStorage.setItem('krunker_terms', 'true');
        localStorage.setItem('readyClaim', 'true');
        localStorage.setItem('krunker_news', '999');
    } catch (e) {
        console.warn('⚠️ Falha ao configurar localStorage:', e);
    }

    // 0.1 GARANTIR ELEMENTOS GLOBAIS DO DOM PARA EVITAR REFERENCEERROR
    const requiredGlobalIds = [
        'menuMiniProfilePic', 'hudClassImg', 'classPreviewCanvas', 'menuClassName',
        'menuClassSubtext', 'claimHolder', 'claimTimer', 'claimImg', 'merchHolder',
        'spinWindow', 'spinItemCanvas', 'spinItemName', 'spinItem', 'spinKR',
        'spinCost', 'spinUI', 'spinButton', 'spinText', 'spinHeader', 'spinInfo',
        'menuFPSDisplay', 'ingameFPS', 'fpsDisplay', 'pingDisplay', 'curGameInfo',
        'teamScores', 'leaderDisplay', 'timerDisplay', 'ammoDisplay', 'healthHolder',
        'weaponDisplay', 'killCardHolder', 'victorySub', 'reticle',
        'instructions', 'instructionHolder', 'chatHolder', 'chatList',
        'specStats', 'speakerDisplay', 'bloodDisplay', 'deathCount',
        'recTimer', 'purchaseLoad', 'purchLoadRing', 'purchaseLabel',
        'customizeBtn', 'customizeButton', 'policeBtn', 'mailCount',
        'newsHolder', 'voiceDisplay', 'inviteBox', 'inviteButton',
        'purchaseHolder', 'chatInput', 'menuClassContainer', 'windowHolder',
        'endTable', 'menuHider', 'subLogoButtons',
        // In-game Match & Spectate & End Screen elements
        'teamName', 'challIcon', 'mapVote', 'specNameTm0', 'teamNm1', 'specNameTm1',
        'teamNm2', 'spec0', 'spec1', 'scoreZoneCount', 'livesCount', 'killStreakHolder',
        'killsVal', 'deathsVal', 'blocker', 'victoryText', 'voteHolder', 'modURL',
        'modInput', 'gameURL', 'mapUpResp', 'modUpResp', 'mapDataNew', 'pubModName',
        'pubModURL', 'modVote'
    ];

    for (const id of requiredGlobalIds) {
        if (!document.getElementById(id)) {
            let tag = 'div';
            if (id.toLowerCase().includes('canvas') || id.toLowerCase().includes('window')) tag = 'canvas';
            else if (id.toLowerCase().includes('pic') || id.toLowerCase().includes('img')) tag = 'img';
            const dummy = document.createElement(tag);
            dummy.id = id;
            dummy.className = 'ghost-ui';
            dummy.style.display = 'none';
            (document.body || document.documentElement).appendChild(dummy);
            window[id] = dummy;
        } else {
            window[id] = document.getElementById(id);
        }
    }

    // Proxy para interceptar qualquer outro ID acessado diretamente no window
    window.addEventListener('error', function (e) {
        if (e && e.message && e.message.includes('is not defined')) {
            const match = e.message.match(/([a-zA-Z0-9_]+) is not defined/);
            if (match && match[1]) {
                const missingId = match[1];
                console.warn('⚠️ Criando elemento dinâmico para evitar crash:', missingId);
                const tag = missingId.toLowerCase().includes('canvas') || missingId.toLowerCase().includes('window') ? 'canvas' : 'div';
                const el = document.createElement(tag);
                el.id = missingId;
                el.className = 'ghost-ui';
                (document.body || document.documentElement).appendChild(el);
                window[missingId] = el;
            }
        }
    });

    // 1. LER CONFIGURAÇÕES DA URL
    const urlParams = new URLSearchParams(window.location.search);
    const mapParam = urlParams.get('map') || 'burg';

    const MAP_MAPPING = {
        'burg': 0,
        'littletown': 1,
        'sandstorm': 2,
        'subzero': 3,
        'kanji': 4
    };

    let selectedMapId = 0;
    if (mapParam in MAP_MAPPING) {
        selectedMapId = MAP_MAPPING[mapParam];
    } else if (!isNaN(parseInt(mapParam))) {
        selectedMapId = parseInt(mapParam);
    }

    console.log('🗺️ Mapa selecionado: ' + mapParam + ' (ID: ' + selectedMapId + ')');
    window.SELECTED_MAP_ID = selectedMapId;

    // Helper: decodificar/codificar pacote msgpack com 2 bytes de padding do Krunker
    function decodePacket(buffer) {
        if (!window.msgpack) return null;
        try {
            const uint8 = new Uint8Array(buffer);
            return window.msgpack.decode(uint8.subarray(0, uint8.length - 2));
        } catch (e) {
            return null;
        }
    }

    function encodePacket(data) {
        if (!window.msgpack) return new Uint8Array(0).buffer;
        try {
            const encoded = window.msgpack.encode(data);
            const packet = new Uint8Array(encoded.length + 2);
            packet.set(encoded, 0);
            return packet.buffer;
        } catch (e) {
            console.error('Erro ao codificar msgpack:', e);
            return new Uint8Array(0).buffer;
        }
    }

    // 2. VIRTUAL IN-BROWSER WEBSOCKET SERVER
    // Permite que o jogo funcione 100% no GitHub Pages sem Node.js backend
    class VirtualWebSocketServer {
        constructor(clientWs) {
            this.client = clientWs;
            this.mapId = window.SELECTED_MAP_ID !== undefined ? window.SELECTED_MAP_ID : 0;
            this.timerInterval = null;
            this.timeRemaining = 240;
            this.init();
        }

        init() {
            console.log('⚡ Virtual WebSocket Server inicializado localmente (Standalone)');
            setTimeout(() => {
                this.client._triggerOpen();
                this.sendPacket(['pi', null]);
                setTimeout(() => {
                    this.sendPacket(['load', 30000, 'offline_player']);
                }, 100);
            }, 50);
        }

        sendPacket(data) {
            const buf = encodePacket(data);
            this.client._dispatchBinaryMessage(buf);
        }

        startTimer() {
            if (this.timerInterval) clearInterval(this.timerInterval);
            this.timerInterval = setInterval(() => {
                const mins = Math.floor(this.timeRemaining / 60);
                const secs = this.timeRemaining % 60;
                const timeStr = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
                this.sendPacket(['t', timeStr]);
                if (this.timeRemaining > 0) {
                    this.timeRemaining--;
                } else {
                    this.timeRemaining = 240;
                }
            }, 1000);
        }

        sendMapInit() {
            const config = {
                "cost": 0, "deltaMlt": 1, "maxPlayers": 2, "minPlayers": 0, "gameTime": 4, "warmupTime": 0,
                "gamRounds": 1, "intermTmr": 30, "forceSpawn": 0, "lives": 0, "scoreLimit": 0, "keepTScore": false,
                "objtvTime": 1, "forceC": true, "logTim": true, "lstChkT": false, "gravMlt": 1, "fallDmg": 0,
                "fallDmgThr": 0, "jumpMlt": 1, "fixMov": false, "slidTime": 1, "slidSpd": 1, "impulseMlt": 1,
                "wallJP": 1, "strafeSpd": 1.2, "canSlide": true, "airStrf": false, "autoJump": false, "bDrop": false,
                "healthMlt": 1, "hitBoxPad": 0.6, "fiRat": 1, "reSpd": 1, "hpRegen": true, "killRewards": true,
                "headshotOnly": false, "noSecondary": false, "noStreaks": false, "disableB": false, "throwMel": true,
                "chrgWeps": true, "selTeam": false, "frFire": false, "nameTeam1": "Team 1", "nameTeam2": "Team 2",
                "allowSpect": true, "thirdPerson": false, "nameTags": false, "kCams": true, "aAnon": true,
                "specSlots": 2, "tmSize": 3, "noCosm": false, "tstCmp": false, "limitClasses": 0, "noDraws": false,
                "bstOfR": false, "headClipFix": false, "maxPS": false, "promServ": false,
                "maps": [0, 1, 2, 3, 4],
                "modes": null,
                "classes": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 15]
            };

            const initData = [
                'init',
                this.mapId,
                0, 0, null, null,
                config,
                null, 0, null,
                {
                    gor: 1, lockT: 0, roundC: 0,
                    bill: { t: 'KRUNKER OFFLINE', tc: '#00ff88', bc: '#000000' },
                    zone: 0, lck: 0,
                    obj: [null, 0],
                    pwup: [0, 0, 0],
                    flg: [],
                    dest: []
                },
                {},
                true, false, false,
                'offline-oid-12345',
                'offline-sid-67890',
                193300
            ];

            this.sendPacket(initData);
            this.startTimer();

            setTimeout(() => { this.sendPacket(['start', 0, true, false, true]); }, 500);
            setTimeout(() => { this.sendPacket(['start', 0, true, false, true]); }, 2000);
        }

        handleClientMessage(buf) {
            const data = decodePacket(buf);
            if (!data || !Array.isArray(data)) return;
            const type = data[0];

            if (type === 'io-init') {
                this.sendPacket(['io-init', 'offline_player']);
                setTimeout(() => {
                    this.sendMapInit();
                }, 200);
            } else if (type === 'po') {
                this.sendPacket(['pir', 1]);
            } else if (type === 'en') {
                this.sendPacket(['start', 0, true, false, true]);
            } else if (type === 's' || type === 'etrg') {
                this.sendPacket(['start', 0, true, false, true]);
            }
        }

        close() {
            if (this.timerInterval) clearInterval(this.timerInterval);
        }
    }

    // 3. WEBSOCKET PROXY COM DETECÇÃO STANDALONE
    const OriginalWebSocket = window.WebSocket;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    window.WebSocket = class {
        constructor(url, protocols) {
            this.binaryType = 'arraybuffer';
            this.readyState = 0; // CONNECTING
            this.listeners = {};
            this.onopen = null;
            this.onmessage = null;
            this.onerror = null;
            this.onclose = null;

            // Se estiver em localhost com servidor backend ativo, tenta OriginalWebSocket primeiro
            if (isLocalhost && OriginalWebSocket) {
                try {
                    const wsUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/';
                    this._realWs = new OriginalWebSocket(wsUrl, protocols);
                    this._realWs.binaryType = 'arraybuffer';

                    this._realWs.onopen = (e) => {
                        this.readyState = 1;
                        if (this.onopen) this.onopen(e);
                        this._emit('open', e);
                    };
                    this._realWs.onmessage = (e) => {
                        if (this.onmessage) this.onmessage(e);
                        this._emit('message', e);
                    };
                    this._realWs.onerror = () => {
                        console.warn('⚠️ Falha no WebSocket real local, ativando Virtual WebSocket...');
                        this._fallbackToVirtual();
                    };
                    this._realWs.onclose = (e) => {
                        if (this.readyState === 1) {
                            this.readyState = 3;
                            if (this.onclose) this.onclose(e);
                            this._emit('close', e);
                        } else {
                            this._fallbackToVirtual();
                        }
                    };
                    return;
                } catch (e) {
                    console.warn('⚠️ Exceção ao conectar no WS local:', e);
                }
            }

            // GitHub Pages ou sem backend local: Iniciar Virtual Server direto
            this._fallbackToVirtual();
        }

        _fallbackToVirtual() {
            this._realWs = null;
            this._virtualServer = new VirtualWebSocketServer(this);
        }

        _triggerOpen() {
            this.readyState = 1; // OPEN
            const evt = new Event('open');
            if (this.onopen) this.onopen(evt);
            this._emit('open', evt);
        }

        _dispatchBinaryMessage(buffer) {
            const evt = new MessageEvent('message', { data: buffer });
            if (this.onmessage) this.onmessage(evt);
            this._emit('message', evt);
        }

        _emit(type, evt) {
            if (this.listeners[type]) {
                for (const cb of this.listeners[type]) {
                    try { cb(evt); } catch (err) { console.error(err); }
                }
            }
        }

        addEventListener(type, listener) {
            if (!this.listeners[type]) this.listeners[type] = [];
            this.listeners[type].push(listener);
        }

        removeEventListener(type, listener) {
            if (!this.listeners[type]) return;
            this.listeners[type] = this.listeners[type].filter(cb => cb !== listener);
        }

        send(data) {
            if (this._realWs && this._realWs.readyState === 1) {
                this._realWs.send(data);
            } else if (this._virtualServer) {
                this._virtualServer.handleClientMessage(data);
            }
        }

        close() {
            this.readyState = 3; // CLOSED
            if (this._realWs) this._realWs.close();
            if (this._virtualServer) this._virtualServer.close();
        }
    };

    // 4. INTERCEPTAR FETCH/XHR PARA CARREGAMENTO LOCAL RELATIVO & MOCK DE APIS
    function mockApiResponse(url) {
        if (url.includes('game-find') || url.includes('game-info') || url.includes('seek-game')) {
            return JSON.stringify({ gameId: "OFFLINE", host: window.location.hostname, port: 8080, clientId: "offline_client" });
        }
        if (url.includes('ping')) {
            return JSON.stringify({ ping: 5, region: "local" });
        }
        if (url.includes('/api/')) {
            return JSON.stringify({ success: true, data: [] });
        }
        return null;
    }

    const originalFetch = window.fetch;
    window.fetch = function (url, options) {
        if (typeof url === 'string') {
            const mocked = mockApiResponse(url);
            if (mocked) {
                return Promise.resolve(new Response(mocked, {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                }));
            }
            url = fixUrl(url);
        }
        return originalFetch(url, options);
    };

    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._reqUrl = url;
        return originalOpen.call(this, method, fixUrl(url), ...rest);
    };

    XMLHttpRequest.prototype.send = function (...args) {
        if (this._reqUrl && typeof this._reqUrl === 'string') {
            const mocked = mockApiResponse(this._reqUrl);
            if (mocked) {
                setTimeout(() => {
                    Object.defineProperty(this, 'readyState', { value: 4, writable: true });
                    Object.defineProperty(this, 'status', { value: 200, writable: true });
                    Object.defineProperty(this, 'responseText', { value: mocked, writable: true });
                    Object.defineProperty(this, 'response', { value: mocked, writable: true });
                    this.dispatchEvent(new Event('readystatechange'));
                    this.dispatchEvent(new Event('load'));
                }, 10);
                return;
            }
        }
        return originalSend.apply(this, args);
    };

    console.log('✅ Hook Standalone v5 pronto com Virtual In-Browser Server e Mocks de API.');
})();
