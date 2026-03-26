import packageJson from "../../package.json";

const DRIVE_ROOT_FOLDER = "Investaty";
const APP_ENVIRONMENT = packageJson.environment || "development";
const ENV_FOLDER_NAME = `data.${APP_ENVIRONMENT}`;
const DATA_FOLDER_NAME = "data";
const DB_FOLDER_NAME = "DB";
const BACKUP_FOLDER_NAME = "Investaty_Backups";
const DRIVE_BASE_PATH = `${DRIVE_ROOT_FOLDER}/${ENV_FOLDER_NAME}/${DATA_FOLDER_NAME}`;
const DRIVE_DB_PATH = `${DRIVE_BASE_PATH}/${DB_FOLDER_NAME}`;
const DRIVE_BACKUP_PATH = `${DRIVE_BASE_PATH}/${BACKUP_FOLDER_NAME}`;
let onUnauthorized = null;

export function setDriveUnauthorizedHandler(handler) {
  onUnauthorized = typeof handler === "function" ? handler : null;
}

async function parseJsonSafe(res) {
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch (_) {
    return { message: txt };
  }
}

export async function ensureDriveOk(res, fallback) {
  if (res.ok) return;
  if (res.status === 401 && onUnauthorized) {
    onUnauthorized();
  }
  const payload = await parseJsonSafe(res);
  const reason = payload?.error?.message || payload?.message || fallback;
  throw new Error(reason);
}

async function findFolderByName(token, name, parentId = null) {
  const parentClause = parentId ? ` and '${parentId}' in parents` : " and 'root' in parents";
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime)&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureDriveOk(res, `Unable to search folder ${name}`);
  const data = await res.json();
  return data?.files?.[0] || null;
}

async function createFolder(token, name, parentId = null) {
  const body = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) body.parents = [parentId];
  const res = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,createdTime", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await ensureDriveOk(res, `Unable to create folder ${name}`);
  return res.json();
}

export async function findOrCreateFolder(token, name, parentId = null) {
  const found = await findFolderByName(token, name, parentId);
  if (found) return found;
  return createFolder(token, name, parentId);
}

export async function getDriveAppFolders(token) {
  const root = await findOrCreateFolder(token, DRIVE_ROOT_FOLDER);
  const envFolder = await findOrCreateFolder(token, ENV_FOLDER_NAME, root.id);
  const dataFolder = await findOrCreateFolder(token, DATA_FOLDER_NAME, envFolder.id);
  const dbFolder = await findOrCreateFolder(token, DB_FOLDER_NAME, dataFolder.id);
  const backupFolder = await findOrCreateFolder(token, BACKUP_FOLDER_NAME, dataFolder.id);
  return {
    root,
    envFolder,
    dataFolder,
    dbFolder,
    backupFolder,
    dbPath: DRIVE_DB_PATH,
    backupPath: DRIVE_BACKUP_PATH,
  };
}

export {
  APP_ENVIRONMENT,
  BACKUP_FOLDER_NAME,
  DATA_FOLDER_NAME,
  DB_FOLDER_NAME,
  DRIVE_BACKUP_PATH,
  DRIVE_BASE_PATH,
  DRIVE_DB_PATH,
  DRIVE_ROOT_FOLDER,
  ENV_FOLDER_NAME,
};
