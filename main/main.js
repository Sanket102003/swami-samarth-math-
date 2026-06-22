import { app, BrowserWindow, session } from "electron";
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
  // Inject CORS headers for all Wix backend requests.
  // Also force status 200 on OPTIONS preflight so the browser accepts it
  // even when Wix returns 404/405 for endpoints without an OPTIONS handler.
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["https://www.swamisamrathbhuigaon.com/_functions/*"] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "access-control-allow-origin":  ["*"],
          "access-control-allow-methods": ["GET, POST, PUT, DELETE, OPTIONS"],
          "access-control-allow-headers": ["Content-Type, Authorization"],
        },
        statusLine: details.method === "OPTIONS" ? "HTTP/1.1 200 OK" : details.statusLine,
      });
    }
  );

  // Spoof Origin/Referer for Cashfree so it sees the whitelisted production domain
  // instead of localhost:8888 (dev) or app://localhost (production build)
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ["https://*.cashfree.com/*"] },
    (details, callback) => {
      callback({
        requestHeaders: {
          ...details.requestHeaders,
          "Origin":  "https://www.swamisamrathbhuigaon.com",
          "Referer": "https://www.swamisamrathbhuigaon.com/",
        },
      });
    }
  );

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