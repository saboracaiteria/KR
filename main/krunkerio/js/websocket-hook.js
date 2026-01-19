// Krunker Offline Mode - Network Hook + Auto Init
// Intercepts all network calls and forces game initialization

(function () {
    console.log('🎮 Krunker Offline Mode - Initializing...');

    // ==========================================
    // 1. AUTO-ACCEPT TERMS (bypass consent screen)
    // ==========================================
    try {
        localStorage.setItem('terms', '1');
        localStorage.setItem('krunker_settings', JSON.stringify({ "terms": true }));
    } catch (e) { }

    // ==========================================
    // 2. OVERRIDE FETCH TO INTERCEPT ALL CALLS
    // ==========================================
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        let url = args[0];
        if (typeof url === 'string') {
            // Redirect matchmaker calls to our local server
            if (url.includes('matchmaker.krunker.io') || url.includes('matchmaker_beta.krunker.io')) {
                console.log('🎯 Intercepting matchmaker call:', url);
                const endpoint = url.split('/').pop().split('?')[0];
                args[0] = window.location.origin + '/' + endpoint;
                console.log('🎯 Redirected to:', args[0]);
            }
            // Redirect API calls
            if (url.includes('api.krunker.io') || url.includes('api_beta.krunker.io')) {
                console.log('🎯 Intercepting API call:', url);
                args[0] = window.location.origin + '/api/mock';
                console.log('🎯 Redirected to:', args[0]);
            }
            // Block recaptcha
            if (url.includes('recaptcha') || url.includes('google.com')) {
                console.log('🚫 Blocking external call:', url);
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
        const originalSend = xhr.send;

        xhr.open = function (method, url, ...rest) {
            this._url = url;
            if (typeof url === 'string') {
                if (url.includes('matchmaker.krunker.io') || url.includes('matchmaker_beta.krunker.io')) {
                    console.log('🎯 XHR Intercepting matchmaker:', url);
                    const endpoint = url.split('/').pop().split('?')[0];
                    url = window.location.origin + '/' + endpoint;
                    console.log('🎯 XHR Redirected to:', url);
                }
                if (url.includes('api.krunker.io') || url.includes('api_beta.krunker.io')) {
                    console.log('🎯 XHR Intercepting API:', url);
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
            const originalUrl = args[0];
            // Determine WebSocket URL based on current location
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = protocol + '//' + window.location.host + '/';

            console.log('🔌 Original WebSocket URL:', originalUrl);
            console.log('🔌 Redirecting to:', wsUrl);

            // Replace the original URL with our server's WebSocket
            args[0] = wsUrl;

            super(...args);

            this.addEventListener('open', () => {
                console.log('✅ WebSocket connected to server!');
            });

            this.addEventListener('error', (e) => {
                console.error('❌ WebSocket error:', e);
            });

            this.addEventListener('close', () => {
                console.log('🔴 WebSocket closed');
            });
        }
    }

    window.WebSocket = HookedWebSocket;

    // ==========================================
    // 5. STUB MISSING FUNCTIONS
    // ==========================================
    window.grecaptcha = {
        ready: function (cb) { if (cb) cb(); },
        execute: function () { return Promise.resolve('mock-token'); },
        render: function () { return 0; }
    };

    window.captchaCallback = function () {
        console.log('📌 captchaCallback triggered');
    };

    window.onSubmit = function () {
        console.log('📌 onSubmit triggered');
    };

    // ==========================================
    // 6. FORCE GAME START AFTER LOAD
    // ==========================================
    window.addEventListener('load', function () {
        console.log('📌 Window loaded, attempting to force game start...');

        // Try to hide loading and show menu after a delay
        setTimeout(function () {
            try {
                // Hide loading text
                const instructions = document.getElementById('instructions');
                if (instructions) {
                    instructions.textContent = 'Click to Play';
                }

                // Try to trigger game init
                if (typeof window.initGame === 'function') {
                    console.log('📌 Calling initGame()...');
                    window.initGame();
                }

                // Force create WebSocket connection
                console.log('📌 Forcing WebSocket connection...');
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const wsUrl = protocol + '//' + window.location.host + '/';
                const ws = new WebSocket(wsUrl);
                ws.onopen = () => console.log('✅ Forced WebSocket connected!');
                ws.onerror = (e) => console.error('❌ Forced WebSocket error:', e);

            } catch (e) {
                console.error('Force start error:', e);
            }
        }, 5000);
    });

    console.log('🎮 Krunker Offline Mode - All hooks active!');
    console.log('   - Fetch intercepted');
    console.log('   - XMLHttpRequest intercepted');
    console.log('   - WebSocket hooked');
    console.log('   - Recaptcha stubbed');
})();
