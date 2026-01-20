/**
 * KRUNKER OFFLINE - LAUNCHER CONTROLLER
 * Manages map selection, settings, and game launch
 */

(function () {
    'use strict';

    // ==========================================
    // CONFIGURATION
    // ==========================================
    const MAPS = [
        { id: 0, name: 'Burg', icon: '🏰', description: 'Medieval fortress' },
        { id: 1, name: 'Littletown', icon: '🏘️', description: 'Suburban streets' },
        { id: 2, name: 'Sandstorm', icon: '🏜️', description: 'Desert outpost' },
        { id: 3, name: 'Subzero', icon: '❄️', description: 'Arctic base' },
        { id: 4, name: 'Kanji', icon: '⛩️', description: 'Japanese temple' }
    ];

    const DEFAULT_SETTINGS = {
        sensitivity: 5,
        volume: 80,
        quality: 'high'
    };

    let selectedMap = 4; // Default to Kanji
    let settings = { ...DEFAULT_SETTINGS };

    // ==========================================
    // INITIALIZATION
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🎮 Krunker Launcher - Initializing...');

        loadSettings();
        renderMaps();
        setupEventListeners();
        updateSettingsUI();

        console.log('🎮 Krunker Launcher - Ready!');
    });

    // ==========================================
    // RENDER MAPS
    // ==========================================
    function renderMaps() {
        const mapGrid = document.getElementById('mapGrid');
        if (!mapGrid) return;

        mapGrid.innerHTML = MAPS.map(map => `
            <div class="map-card ${map.id === selectedMap ? 'selected' : ''}" 
                 data-map-id="${map.id}"
                 onclick="selectMap(${map.id})">
                <div class="map-placeholder">${map.icon}</div>
                <div class="map-info">
                    <div class="map-name">${map.name}</div>
                    <div class="map-id">${map.description}</div>
                </div>
            </div>
        `).join('');
    }

    // ==========================================
    // MAP SELECTION
    // ==========================================
    window.selectMap = function (mapId) {
        selectedMap = mapId;

        // Update UI
        document.querySelectorAll('.map-card').forEach(card => {
            card.classList.remove('selected');
            if (parseInt(card.dataset.mapId) === mapId) {
                card.classList.add('selected');
            }
        });

        // Play sound effect (if available)
        try {
            const audio = new Audio();
            audio.volume = 0.3;
        } catch (e) { }

        console.log(`📍 Map selected: ${MAPS[mapId].name}`);
        saveSettings();
    };

    // ==========================================
    // SETTINGS MANAGEMENT
    // ==========================================
    function setupEventListeners() {
        // Sensitivity slider
        const sensitivitySlider = document.getElementById('sensitivity');
        if (sensitivitySlider) {
            sensitivitySlider.addEventListener('input', (e) => {
                settings.sensitivity = parseInt(e.target.value);
                updateSettingsUI();
                saveSettings();
            });
        }

        // Volume slider
        const volumeSlider = document.getElementById('volume');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                settings.volume = parseInt(e.target.value);
                updateSettingsUI();
                saveSettings();
            });
        }

        // Quality select
        const qualitySelect = document.getElementById('quality');
        if (qualitySelect) {
            qualitySelect.addEventListener('change', (e) => {
                settings.quality = e.target.value;
                saveSettings();
            });
        }

        // Play button
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.addEventListener('click', launchGame);
        }

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                launchGame();
            }
        });
    }

    function updateSettingsUI() {
        // Update sensitivity display
        const sensitivityValue = document.getElementById('sensitivityValue');
        const sensitivitySlider = document.getElementById('sensitivity');
        if (sensitivityValue && sensitivitySlider) {
            sensitivityValue.textContent = settings.sensitivity;
            sensitivitySlider.value = settings.sensitivity;
        }

        // Update volume display
        const volumeValue = document.getElementById('volumeValue');
        const volumeSlider = document.getElementById('volume');
        if (volumeValue && volumeSlider) {
            volumeValue.textContent = settings.volume + '%';
            volumeSlider.value = settings.volume;
        }

        // Update quality select
        const qualitySelect = document.getElementById('quality');
        if (qualitySelect) {
            qualitySelect.value = settings.quality;
        }
    }

    function saveSettings() {
        const data = {
            selectedMap,
            settings
        };
        try {
            localStorage.setItem('krunker_launcher', JSON.stringify(data));
        } catch (e) {
            console.warn('Could not save settings');
        }
    }

    function loadSettings() {
        try {
            const data = localStorage.getItem('krunker_launcher');
            if (data) {
                const parsed = JSON.parse(data);
                selectedMap = parsed.selectedMap ?? 4;
                settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
            }
        } catch (e) {
            console.warn('Could not load settings');
        }
    }

    // ==========================================
    // GAME LAUNCH
    // ==========================================
    function launchGame() {
        console.log(`🚀 Launching game with map: ${MAPS[selectedMap].name}`);

        // Show loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('active');
        }

        // Update loading text
        const loadingText = document.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = `Loading ${MAPS[selectedMap].name}...`;
        }

        // Save current selection
        saveSettings();

        // Auto-accept terms for offline mode
        try {
            localStorage.setItem('terms', '1');
            localStorage.setItem('consent', '1');
            localStorage.setItem('krunker_settings', JSON.stringify({
                terms: true,
                sensitivity: settings.sensitivity,
                volume: settings.volume
            }));
        } catch (e) { }

        // Navigate to game with selected map
        setTimeout(() => {
            window.location.href = `index.html?map=${selectedMap}&quality=${settings.quality}`;
        }, 800);
    }

    // ==========================================
    // EXPOSE FOR DEBUG
    // ==========================================
    window.LauncherDebug = {
        getSelectedMap: () => selectedMap,
        getSettings: () => settings,
        getMaps: () => MAPS
    };

})();
