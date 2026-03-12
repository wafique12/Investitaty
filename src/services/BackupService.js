import { BACKUP_FOLDER_NAME, ensureDriveOk, getDriveAppFolders } from "./DrivePaths";

const BACKUP_META_KEY = "investitaty_backup_meta_v1";
const MAX_BACKUPS = 5;
const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

function formatDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseBackupDate(name = "") {
  const match = String(name).match(/backup_(\d{4}-\d{2}-\d{2})_investaty\.json$/);
  if (!match) return null;
  return match[1];
}

async function findOrCreateBackupFolder(token) {
  const { backupFolder } = await getDriveAppFolders(token);
  return backupFolder.id;
}

async function listBackups(token, folderId) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and name contains 'backup_'`);
  const listRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,modifiedTime)&orderBy=createdTime desc&pageSize=20`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureDriveOk(listRes, "Unable to list backup files");
  const listData = await listRes.json();
  return (listData?.files || [])
    .filter((file) => /backup_\d{4}-\d{2}-\d{2}_investaty\.json$/.test(file.name || ""))
    .sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
}

function getStoredMeta() {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function setStoredMeta(meta) {
  try {
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify(meta));
  } catch (_) {
    // noop
  }
}

async function createBackup(token, db) {
  const folderId = await findOrCreateBackupFolder(token);
  const backupName = `backup_${formatDate()}_investaty.json`;
  const boundary = "investitaty_backup_boundary";
  const metadata = JSON.stringify({ name: backupName, parents: [folderId], mimeType: "application/json" });
  const content = JSON.stringify(db, null, 2);
  const multipart = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  const createRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
  });
  await ensureDriveOk(createRes, "Unable to create backup");
  const created = await createRes.json();

  const backups = await listBackups(token, folderId);
  const toDelete = backups.slice(MAX_BACKUPS);
  await Promise.all(toDelete.map(async (item) => {
    const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${item.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await ensureDriveOk(delRes, `Unable to delete old backup ${item.name}`);
  }));

  const now = new Date().toISOString();
  setStoredMeta({ lastBackupAt: now, lastBackupName: backupName });

  return { file: created, lastBackupAt: now, backups: (await listBackups(token, folderId)).slice(0, MAX_BACKUPS) };
}

async function downloadBackup(token, fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await ensureDriveOk(res, "Unable to download backup file");
  return res.json();
}

function shouldAutoBackup(lastBackupAt) {
  if (!lastBackupAt) return true;
  const lastMs = new Date(lastBackupAt).getTime();
  if (!Number.isFinite(lastMs)) return true;
  return Date.now() - lastMs > BACKUP_INTERVAL_MS;
}

const BackupService = {
  BACKUP_FOLDER_NAME,
  BACKUP_META_KEY,
  MAX_BACKUPS,
  parseBackupDate,
  getStoredMeta,
  setStoredMeta,
  findOrCreateBackupFolder,
  listBackups,
  createBackup,
  downloadBackup,
  shouldAutoBackup,
};

export default BackupService;
