// Krunker Offline Mode - Network Hook + Auto Init + Force Menu
// Intercepts all network calls and forces game initialization with visible menu

(function () {
    console.log('🎮 Krunker Offline Mode - Initializing...');

    // ==========================================
    // 1. AUTO-ACCEPT TERMS
    // ==========================================
    try {
        localStorage.setItem('terms', '1');
        localStorage.setItem('consent', '1');
        localStorage.setItem('krunker_settings', JSON.stringify({ "terms": true }));
    } catch (e) { }

    // ==========================================
    // 2. OVERRIDE FETCH
    // ==========================================
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        let url = args[0];
        if (typeof url === 'string') {
            if (url.includes('matchmaker.krunker.io') || url.includes('matchmaker_beta.krunker.io')) {
                console.log('🎯 Intercepting matchmaker:', url);
                const endpoint = url.split('/').pop().split('?')[0];
                args[0] = window.location.origin + '/' + endpoint;
            }
            if (url.includes('api.krunker.io') || url.includes('api_beta.krunker.io')) {
                args[0] = window.location.origin + '/api/mock';
            }
            if (url.includes('recaptcha') || url.includes('google.com/recaptcha')) {
                return new Response('{}', { status: 200 });
            }
        }
        return originalFetch.apply(this, args);
    };

    // ==========================================
    // 3. OVERRIDE XMLHttpRequest
    // ==========================================
    const OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function () {
        const xhr = new OriginalXHR();
        const originalOpen = xhr.open;
        xhr.open = function (method, url, ...rest) {
            if (typeof url === 'string') {
                if (url.includes('matchmaker.krunker.io') || url.includes('matchmaker_beta.krunker.io')) {
                    const endpoint = url.split('/').pop().split('?')[0];
                    url = window.location.origin + '/' + endpoint;
                }
                if (url.includes('api.krunker.io') || url.includes('api_beta.krunker.io')) {
                    url = window.location.origin + '/api/mock';
                }
            }
            return originalOpen.call(this, method, url, ...rest);
        };
        return xhr;
    };

    // ==========================================
    // 4. WEBSOCKET HOOK
    // ==========================================
    const OriginalWebSocket = window.WebSocket;

    class HookedWebSocket extends OriginalWebSocket {
        constructor(...args) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = protocol + '//' + window.location.host + '/';
            console.log('🔌 WebSocket redirected to:', wsUrl);
            args[0] = wsUrl;
            super(...args);

            this.addEventListener('open', () => {
                console.log('✅ WebSocket connected!');
                // Force show menu when connected
                setTimeout(forceShowMenu, 500);
            });
        }
    }

    window.WebSocket = HookedWebSocket;

    // ==========================================
    // 5. RECAPTCHA STUBS
    // ==========================================
    window.grecaptcha = {
        ready: (cb) => cb && cb(),
        execute: () => Promise.resolve('mock-token'),
        render: () => 0
    };
    window.captchaCallback = () => { };
    window.onSubmit = () => { };

    // ==========================================
    // 6. FORCE SHOW MENU FUNCTION
    // ==========================================
    function forceShowMenu() {
        console.log('📌 Forcing menu visibility...');

        // Hide loading/instruction
        const instruction = document.getElementById('instructionHolder');
        if (instruction) instruction.style.display = 'none';

        // Show menu holder
        const menuHider = document.getElementById('menuHider');
        if (menuHider) {
            menuHider.style.display = 'block';
            menuHider.style.visibility = 'visible';
            menuHider.style.opacity = '1';
        }

        // Show menu holder parent
        const menuHolder = document.getElementById('menuHolder');
        if (menuHolder) {
            menuHolder.style.display = 'block';
            menuHolder.style.visibility = 'visible';
        }

        // Show subLogoButtons
        const subLogoButtons = document.getElementById('subLogoButtons');
        if (subLogoButtons) {
            subLogoButtons.style.display = 'flex';
            subLogoButtons.style.visibility = 'visible';
        }

        // Show menu items
        const menuItemContainer = document.getElementById('menuItemContainer');
        if (menuItemContainer) {
            menuItemContainer.style.display = 'block';
            menuItemContainer.style.visibility = 'visible';
        }

        // Show class container (player preview)
        const classContainer = document.getElementById('menuClassContainer');
        if (classContainer) {
            classContainer.style.display = 'block';
            classContainer.style.visibility = 'visible';
        }

        // Show game name/logo
        const gameNameHolder = document.getElementById('gameNameHolder');
        if (gameNameHolder) {
            gameNameHolder.style.display = 'block';
            gameNameHolder.style.visibility = 'visible';
        }

        // Hide blockers
        const blocker = document.getElementById('blocker');
        if (blocker) blocker.style.display = 'none';

        const overlay = document.getElementById('overlay');
        if (overlay) overlay.style.display = 'none';

        // Show UI base
        const uiBase = document.getElementById('uiBase');
        if (uiBase) {
            uiBase.style.display = 'block';
            uiBase.style.visibility = 'visible';
        }

        console.log('📌 Menu should be visible now');
    }

    // ==========================================
    // 7. FORCE CONNECTION AND MENU ON LOAD
    // ==========================================
    window.addEventListener('load', function () {
        console.log('📌 Window loaded');

        // Update loading text
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.textContent = 'Click to Play';
        }

        // Create WebSocket connection
        setTimeout(() => {
            console.log('📌 Creating WebSocket connection...');
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = protocol + '//' + window.location.host + '/';
            window._offlineWs = new WebSocket(wsUrl);
        }, 3000);

        // Force show menu after delay
        setTimeout(forceShowMenu, 5000);
    });

    // Also force menu on click
    document.addEventListener('click', function (e) {
        setTimeout(forceShowMenu, 500);
    });

    console.log('🎮 Krunker Offline Mode - All hooks active!');
})();
