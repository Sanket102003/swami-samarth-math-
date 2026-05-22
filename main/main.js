import { app, BrowserWindow } from "electron";
import serve from "electron-serve";
import path from "path";
import { fileURLToPath } from "url";

const isDev = process.env.NODE_ENV !== "production";

// Serve the exported Next.js files in production
const loadURL = serve({
  directory: "app",
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL("http://localhost:8888");
    mainWindow.webContents.openDevTools();
    // Restore focus to main window after DevTools opens
    mainWindow.webContents.once("devtools-opened", () => {
      mainWindow.webContents.focus();
    });
  } else {
    await loadURL(mainWindow);
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});