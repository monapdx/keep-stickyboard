const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { importKeepFolder } = require("./keepImport.cjs");

const isDev = !!process.env.VITE_DEV_SERVER_URL;
const STATE_FILE = "keep-sticky-board-state.json";

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: "#f6f3ea",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    // DevTools only when loading the Vite dev server, never in packaged builds.
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function getStatePath() {
  return path.join(app.getPath("userData"), STATE_FILE);
}

ipcMain.handle("keep:pickFolder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Google Keep export folder",
  });

  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

ipcMain.handle("keep:import", async (_, folder) => {
  try {
    const data = await importKeepFolder(folder);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || "Import failed" };
  }
});

ipcMain.handle("state:load", async () => {
  try {
    const statePath = getStatePath();
    if (!fs.existsSync(statePath)) return { ok: true, data: null };
    const data = JSON.parse(fs.readFileSync(statePath, "utf8"));
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: error.message || "Could not load state" };
  }
});

ipcMain.handle("state:save", async (_, data) => {
  try {
    const statePath = getStatePath();
    fs.writeFileSync(statePath, JSON.stringify(data, null, 2), "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || "Could not save state" };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
