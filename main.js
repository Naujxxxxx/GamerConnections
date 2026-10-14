// GamerConnections — janela desktop (Electron)
const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;

function createWindow() {
    const iconPath = path.join(__dirname, 'assets', 'icon.ico');
    win = new BrowserWindow({
        width: 1366,
        height: 860,
        minWidth: 1024,
        minHeight: 640,
        title: 'GamerConnections',
        backgroundColor: '#05070e',
        autoHideMenuBar: true,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    Menu.setApplicationMenu(null);
    win.loadFile(path.join(__dirname, 'index.html'));

    // Links externos abrem no navegador padrão
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    win.on('closed', () => {
        win = null;
    });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (win) {
            if (win.isMinimized()) win.restore();
            win.focus();
        }
    });
    app.whenReady().then(createWindow);
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') app.quit();
    });
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
}
