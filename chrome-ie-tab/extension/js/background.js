import {
  getSettings,
  saveSettings,
  extractDomain,
  matchesAutoList,
  isOpenableUrl,
  openInIe
} from './shared.js';

const MENU_OPEN = 'open-in-ie';
const MENU_ADD = 'add-auto-list';
const autoOpenedTabs = new Set();

chrome.runtime.onInstalled.addListener(async () => {
  await ensureContextMenus();
  const settings = await getSettings();
  if (!Array.isArray(settings.autoList)) {
    await saveSettings({ autoList: [] });
  }
});

chrome.runtime.onStartup.addListener(() => {
  ensureContextMenus();
});

async function ensureContextMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: MENU_OPEN,
    title: 'Abrir no Internet Explorer',
    contexts: ['page', 'link', 'action']
  });
  chrome.contextMenus.create({
    id: MENU_ADD,
    title: 'Adicionar domínio à lista automática do IE',
    contexts: ['page', 'action']
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_OPEN) {
    const url = info.linkUrl || info.pageUrl || tab?.url;
    await handleOpen(url, tab?.id);
    return;
  }

  if (info.menuItemId === MENU_ADD && tab?.url) {
    const domain = extractDomain(tab.url);
    if (!domain) return;
    const settings = await getSettings();
    if (!settings.autoList.includes(domain)) {
      await saveSettings({ autoList: [...settings.autoList, domain] });
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-in-ie') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) await handleOpen(tab.url, tab.id);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === 'OPEN_IN_IE') {
      const result = await handleOpen(message.url, message.tabId);
      sendResponse(result);
      return;
    }
    if (message?.type === 'GET_STATUS') {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const settings = await getSettings();
      const domain = tab?.url ? extractDomain(tab.url) : null;
      sendResponse({
        url: tab?.url || null,
        tabId: tab?.id ?? null,
        domain,
        inAutoList: domain ? settings.autoList.includes(domain) : false,
        settings
      });
      return;
    }
    if (message?.type === 'TOGGLE_DOMAIN') {
      const settings = await getSettings();
      const domain = message.domain;
      let autoList = [...settings.autoList];
      if (autoList.includes(domain)) {
        autoList = autoList.filter((d) => d !== domain);
      } else {
        autoList.push(domain);
      }
      await saveSettings({ autoList });
      sendResponse({ ok: true, autoList });
      return;
    }
    sendResponse({ ok: false, error: 'Mensagem desconhecida' });
  })();
  return true;
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading' && changeInfo.status !== 'complete') return;
  if (!tab?.url || !isOpenableUrl(tab.url)) return;

  // Only auto-open once per navigation start
  if (changeInfo.status !== 'loading') return;

  const settings = await getSettings();
  if (!settings.autoOpenEnabled) return;
  if (!matchesAutoList(tab.url, settings.autoList)) return;

  const key = `${tabId}:${tab.url}`;
  if (autoOpenedTabs.has(key)) return;
  autoOpenedTabs.add(key);

  // Prevent unbounded growth
  if (autoOpenedTabs.size > 200) {
    const first = autoOpenedTabs.values().next().value;
    autoOpenedTabs.delete(first);
  }

  await handleOpen(tab.url, tabId, { fromAuto: true });
});

async function handleOpen(url, tabId, { fromAuto = false } = {}) {
  if (!isOpenableUrl(url)) {
    return { ok: false, error: 'Esta página não pode ser aberta no IE (chrome://, extension://, etc.).' };
  }

  const result = await openInIe(url);
  const settings = await getSettings();

  if (result.ok && settings.closeChromeTabAfterOpen && Number.isInteger(tabId)) {
    try {
      await chrome.tabs.remove(tabId);
    } catch {
      // ignore
    }
  }

  if (!result.ok && fromAuto) {
    // Keep quiet on auto failures to avoid spam; popup can diagnose.
    console.warn('Chrome IE Tab auto-open failed:', result.error);
  }

  return result;
}
