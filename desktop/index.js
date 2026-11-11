const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0f172a',
    autoHideMenuBar: true,
    title: 'TENDO Prototype',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const entryPoint = app.isPackaged
    ? path.join(process.resourcesPath, 'web', 'index.html')
    : path.join(__dirname, '..', 'index.html');
  win.loadURL(pathToFileURL(entryPoint).href).catch(error => {
    console.error('Unable to load the TENDO prototype interface.', error);
    dialog.showErrorBox('TENDO Prototype could not start', 'The application interface could not be loaded.');
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const destination = new URL(url);
    const localEntry = new URL(pathToFileURL(entryPoint).href);
    if (destination.protocol === 'file:' && destination.pathname === localEntry.pathname) return;
    event.preventDefault();
    openExternalUrl(url);
  });
}

function openExternalUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      shell.openExternal(url.href).catch(error => {
        console.error('Unable to open the external link.', error);
      });
    }
  } catch (error) {
    console.error('Blocked an invalid external link.', error);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
