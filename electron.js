const { app, BrowserWindow } = require('electron');
const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = false;
const nextApp = next({ dev, dir: __dirname });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    server.listen(3000, () => {
        const win = new BrowserWindow({
            width: 1280,
            height: 720,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        win.loadURL('http://localhost:3000');
        win.setMenuBarVisibility(false);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});