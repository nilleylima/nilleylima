import { isOpenableUrl } from './shared.js';

const currentUrlEl = document.getElementById('currentUrl');
const btnOpen = document.getElementById('btnOpen');
const btnToggleDomain = document.getElementById('btnToggleDomain');
const statusBox = document.getElementById('statusBox');
const statusText = document.getElementById('statusText');
const extensionIdEl = document.getElementById('extensionId');

let state = {
  url: null,
  tabId: null,
  domain: null,
  inAutoList: false
};

function showStatus(message, kind = 'info') {
  statusBox.hidden = false;
  statusBox.dataset.kind = kind;
  statusText.textContent = message;
}

function truncate(url, max = 64) {
  if (!url) return '—';
  return url.length > max ? url.slice(0, max - 1) + '…' : url;
}

function refreshToggleLabel() {
  if (!state.domain) {
    btnToggleDomain.hidden = true;
    return;
  }
  btnToggleDomain.hidden = false;
  btnToggleDomain.textContent = state.inAutoList
    ? `Remover ${state.domain} da lista automática`
    : `Adicionar ${state.domain} à lista automática`;
}

async function load() {
  extensionIdEl.textContent = `ID: ${chrome.runtime.id}`;
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  state = { ...state, ...response };
  currentUrlEl.textContent = truncate(state.url);
  currentUrlEl.title = state.url || '';
  btnOpen.disabled = !isOpenableUrl(state.url);
  refreshToggleLabel();

  if (!isOpenableUrl(state.url)) {
    showStatus('Abra uma página http(s) para usar o IE Tab.', 'warn');
  }
}

btnOpen.addEventListener('click', async () => {
  btnOpen.disabled = true;
  showStatus('Abrindo no Internet Explorer…', 'info');
  const result = await chrome.runtime.sendMessage({
    type: 'OPEN_IN_IE',
    url: state.url,
    tabId: state.tabId
  });
  btnOpen.disabled = !isOpenableUrl(state.url);

  if (result?.ok) {
    showStatus('Página aberta no visualizador IE.', 'ok');
    return;
  }

  const err = result?.error || 'Falha desconhecida.';
  showStatus(err, 'error');
});

btnToggleDomain.addEventListener('click', async () => {
  if (!state.domain) return;
  const result = await chrome.runtime.sendMessage({
    type: 'TOGGLE_DOMAIN',
    domain: state.domain
  });
  if (result?.ok) {
    state.inAutoList = result.autoList.includes(state.domain);
    refreshToggleLabel();
    showStatus(
      state.inAutoList
        ? `${state.domain} adicionado à lista automática.`
        : `${state.domain} removido da lista automática.`,
      'ok'
    );
  }
});

load().catch((err) => showStatus(String(err), 'error'));
