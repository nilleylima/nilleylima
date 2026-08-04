import { getSettings, saveSettings, pingHost } from './shared.js';

const autoListEl = document.getElementById('autoList');
const autoOpenEnabledEl = document.getElementById('autoOpenEnabled');
const closeTabEl = document.getElementById('closeChromeTabAfterOpen');
const saveStatus = document.getElementById('saveStatus');
const extIdEl = document.getElementById('extId');
const pingResult = document.getElementById('pingResult');

extIdEl.textContent = chrome.runtime.id;

async function load() {
  const settings = await getSettings();
  autoListEl.value = (settings.autoList || []).join('\n');
  autoOpenEnabledEl.checked = !!settings.autoOpenEnabled;
  closeTabEl.checked = !!settings.closeChromeTabAfterOpen;
}

document.getElementById('btnSave').addEventListener('click', async () => {
  const autoList = autoListEl.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  await saveSettings({
    autoList,
    autoOpenEnabled: autoOpenEnabledEl.checked,
    closeChromeTabAfterOpen: closeTabEl.checked
  });

  saveStatus.textContent = 'Salvo.';
  setTimeout(() => {
    saveStatus.textContent = '';
  }, 2000);
});

document.getElementById('btnCopyId').addEventListener('click', async () => {
  await navigator.clipboard.writeText(chrome.runtime.id);
  pingResult.textContent = 'ID copiado.';
});

document.getElementById('btnPing').addEventListener('click', async () => {
  pingResult.textContent = 'Testando…';
  const result = await pingHost();
  if (result.ok) {
    pingResult.textContent = `Host OK${result.detail?.version ? ` (v${result.detail.version})` : ''}.`;
  } else {
    pingResult.textContent = `Falha: ${result.error}. Instale o host com native-host/install.ps1 no Windows.`;
  }
});

load();
