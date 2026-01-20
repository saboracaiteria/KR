const { app, BrowserWindow, session, protocol, Menu } = require('electron')
const gameserver = require('./gameserver.js')
const fs = require('fs')
const path = require('path')
Menu.setApplicationMenu(null)

const MAPS = {
    burg: 0,
    littletown: 1,
    sandstorm: 2,
    subzero: 3,
    kanji: 4
} // press F4 ingame to switch between maps

const defaultSelectedMap = MAPS.kanji

app.whenReady().then(() => {
    protocol.interceptBufferProtocol("https", (request, result) => {
        // Launcher HTML
        if (request.url === "https://krunker.io/launcher.html" || request.url === "https://krunker.io/launcher.html/") {
            let data = fs.readFileSync(path.join(__dirname, 'krunkerio/launcher.html'))
            result(Buffer.from(data.toString()))
            return
        }
        // Game HTML (root or index.html with query params)
        if (request.url === "https://krunker.io/" || request.url.match(/https:\/\/krunker\.io\/index\.html(\?.*)?$/)) {
            let data = fs.readFileSync(path.join(__dirname, 'krunkerio/index.html'))
            result(Buffer.from(data.toString()))
            return
        }
        // Launcher CSS
        if (request.url.includes('launcher.css')) {
            let data = fs.readFileSync(path.join(__dirname, 'krunkerio/css/launcher.css'))
            result(Buffer.from(data.toString()))
            return
        }
        // Launcher JS
        if (request.url.includes('launcher.js')) {
            let data = fs.readFileSync(path.join(__dirname, 'krunkerio/js/launcher.js'))
            result(Buffer.from(data.toString()))
            return
        }
        // Main CSS
        if (request.url.includes('main.css')) {
            let data = fs.readFileSync(path.join(__dirname, 'krunkerio/css/main.css'))
            result(Buffer.from(data.toString()))
            return
        }
        // Material Icons CSS
        if (request.url.includes('material_icons.css')) {
            let data = fs.readFileSync(path.join(__dirname, 'krunkerio/css/material_icons.css'))
            result(Buffer.from(data.toString()))
            return
        }
        // Offline Mode CSS
        if (request.url.includes('offline_mode.css')) {
            let data = fs.readFileSync(path.join(__dirname, 'krunkerio/css/offline_mode.css'))
            result(Buffer.from(data.toString()))
            return
        }
        protocol.uninterceptProtocol('https')
        console.log(request.url)
    })
    protocol.interceptFileProtocol('krnk', (details, callback) => {

        let filepath = details.url.replace('krnk://', (__dirname).replaceAll('\\', "/") + "/krunkerio/")

        if (filepath.includes('?')) {
            filepath = filepath.substring(0, filepath.indexOf('?'))
        }
        if (fs.existsSync(filepath)) {
            callback(filepath)
            return
        }
        if (filepath.includes('ping')) {
            callback(path.join(__dirname, 'apireqs/ping.json'))
            return
        }
        callback()
    })
    session.defaultSession.webRequest.onBeforeRequest((request, callback) => {
        if (request.url.replaceAll('/', '') === "https:krunker.io") { return }
        if (request.url.startsWith('https://krunker.io/')) {
            let urlpath = request.url.replace('https://krunker.io/', '')
            if (urlpath.startsWith('/')) { urlpath = urlpath.replace('/', '') }
            callback({ redirectURL: 'krnk://' + urlpath })
            return
        }

        callback(request)
    })

    gameserver(defaultSelectedMap, createWindow)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1100,
        height: 700,
        icon: path.join(__dirname, 'krunkerio/favicon.ico'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    })

    // Load launcher first instead of game directly
    mainWindow.loadURL('https://krunker.io/launcher.html')
    mainWindow.webContents.on('before-input-event', (e, f) => {
        switch (f.key) {
            case "Escape":
                e.preventDefault()
                mainWindow.webContents.executeJavaScript("document.exitPointerLock()")
                break
            case "F11":
                mainWindow.setFullScreen(!mainWindow.isFullScreen())
                e.preventDefault()
                break
            case "F9":
                mainWindow.webContents.openDevTools()
                e.preventDefault()
                break
            case "F4":
                e.preventDefault()
                gameserver.resetMap()
        }
    })
}


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})