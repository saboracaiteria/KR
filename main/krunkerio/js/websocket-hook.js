/**
 * KRUNKER OFFLINE - DIRECT HOOK v4
 * Força o jogo a entrar direto / Configurações / Anti-Crash
 */

(function () {
    console.log('⚡ Hook Direct-Play v4 Ativo (Safe Mode)');

    // 1. CONFIGURAÇÃO INSTANTÂNEA
    function forceSettings() {
        try {
            localStorage.setItem('krunker_settings', JSON.stringify({
                terms: true,
                needsTutorial: false,
                error: false,
                start: true,
                showWeapon: true,
                weaponBob: true,
                fov: 70,
                resolution: 1,
                crosshair: 0
            }));

            localStorage.setItem('krunker_class', '0');
            localStorage.setItem('class', '0');
            localStorage.setItem('terms', '1');
            localStorage.setItem('consent', '1');
        } catch (e) { }
    }
    forceSettings();
    setInterval(forceSettings, 2000);

    // 1.5 LER PARÂMETRO DO MAPA DA URL
    const urlParams = new URLSearchParams(window.location.search);
    const mapId = urlParams.get('map');
    if (mapId !== null) {
        console.log(`🗺️ Mapa selecionado: ${mapId}`);
        try {
            localStorage.setItem('krunker_map', mapId);
            localStorage.setItem('map', mapId);
            window.SELECTED_MAP_ID = parseInt(mapId);
        } catch (e) { }
    }

    // 2. WEBSOCKET PROXY
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = class extends OriginalWebSocket {
        constructor(...args) {
            const wsUrl = (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/';
            super(wsUrl);

            this.addEventListener('open', () => {
                console.log('✅ WS Conectado');
                // Não interagimos com DOM agressivamente aqui para evitar race conditions
            });
        }
    };

    // 3. INTERCEPTAR FETCH/XHR
    const originalFetch = window.fetch;
    window.fetch = async (url, ...args) => {
        // Interceptar requisições de mapas
        if (typeof url === 'string') {
            // Maps list
            if (url.includes('maps_0.json') || url.includes('/maps/maps_0.json')) {
                console.log('📦 Carregando lista de mapas localmente');
                return originalFetch('/maps/maps_0.json', ...args);
            }

            // Individual map data (burg.json, kanji.json, etc)
            if (url.match(/\/(burg|littletown|sandstorm|subzero|kanji)\.json/)) {
                const mapName = url.match(/\/(burg|littletown|sandstorm|subzero|kanji)\.json/)[1];
                console.log(`🗺️ Carregando mapa ${mapName} localmente`);
                return originalFetch(`/maps/${mapName}.json`, ...args);
            }
        }
        return originalFetch(url, ...args);
    };

    // 4. ELIMINAR UI VIA JS (Safe List)
    // Removemos apenas menus específicos, deixamos uiBase e aimRecticle para CSS lidar ou jogo usar
    setInterval(() => {
        const toHide = ['menuHolder', 'windowHolder', 'consentBlock', 'instructions'];
        toHide.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.display !== 'none') {
                el.style.display = 'none';
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
            }
        });

        // Forçar HUD visível
        const gameUI = document.getElementById('gameUI');
        if (gameUI && (gameUI.style.display === 'none' || gameUI.style.visibility === 'hidden')) {
            gameUI.style.display = 'block';
            gameUI.style.visibility = 'visible';
        }
    }, 100);

    // 5. BOTÃO DE VOLTAR
    window.addEventListener('load', () => {
        const btn = document.createElement('div');
        btn.innerHTML = '&#8592;';
        btn.style.cssText = `
            position: fixed; top: 10px; left: 10px;
            color: rgba(255,255,255,0.3); font-size: 24px;
            cursor: pointer; z-index: 99999;
            transition: 0.2s; user-select: none;
        `;
        btn.onmouseover = () => btn.style.color = 'white';
        btn.onmouseout = () => btn.style.color = 'rgba(255,255,255,0.3)';
        btn.onclick = () => window.location.href = '/launcher';
        document.body.appendChild(btn);
    });

})();
