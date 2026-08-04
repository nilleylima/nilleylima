/**
 * Chrome IE Tab — shared helpers
 */

export const NATIVE_HOST = 'com.nilleylima.chrome_ie_tab';

export const DEFAULT_SETTINGS = {
  autoList: [],
  autoOpenEnabled: true,
  closeChromeTabAfterOpen: false,
  notifyOnAutoOpen: true
};

export async function getSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const next = { ...current, ...partial };
  await chrome.storage.sync.set(next);
  return next;
}

export function extractDomain(url) {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Patterns:
 * - exact domain: intranet.empresa.local
 * - wildcard: *.empresa.local
 * - path prefix: https://legado.empresa.local/app/*
 * - full URL substring via * in the middle
 */
export function urlMatchesPattern(url, pattern) {
  const p = (pattern || '').trim();
  if (!p) return false;

  try {
    // Full URL / path patterns, e.g. https://host/app/*
    if (p.includes('://')) {
      const escaped = p
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      return new RegExp(`^${escaped}$`, 'i').test(url);
    }

    const host = extractDomain(url);
    if (!host) return false;
    const rule = p.toLowerCase();
    if (rule.startsWith('*.')) {
      const apex = rule.slice(2);
      return host === apex || host.endsWith('.' + apex);
    }
    return host === rule || host.endsWith('.' + rule);
  } catch {
    return false;
  }
}

export function matchesAutoList(url, autoList) {
  return (autoList || []).some((pattern) => urlMatchesPattern(url, pattern));
}

export function isOpenableUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    return ['http:', 'https:', 'file:'].includes(u.protocol);
  } catch {
    return false;
  }
}

/**
 * Opens URL via native host (Windows IE/Trident viewer).
 * @returns {Promise<{ok: boolean, error?: string, detail?: any}>}
 */
export async function openInIe(url) {
  if (!isOpenableUrl(url)) {
    return { ok: false, error: 'URL inválida para o Internet Explorer.' };
  }

  try {
    const response = await chrome.runtime.sendNativeMessage(NATIVE_HOST, {
      action: 'open',
      url
    });

    if (chrome.runtime.lastError) {
      return {
        ok: false,
        error: chrome.runtime.lastError.message || 'Falha ao falar com o host nativo.'
      };
    }

    if (!response) {
      return { ok: false, error: 'Sem resposta do host nativo.' };
    }

    if (response.ok === false) {
      return { ok: false, error: response.error || 'Host nativo recusou a abertura.', detail: response };
    }

    return { ok: true, detail: response };
  } catch (err) {
    const message = String(err?.message || err);
    if (/Specified native messaging host not found|Access to the specified native messaging host is forbidden/i.test(message)) {
      return {
        ok: false,
        error: 'Host nativo não encontrado. Execute o instalador em native-host/install.ps1 no Windows.',
        code: 'HOST_MISSING'
      };
    }
    return { ok: false, error: message };
  }
}

export async function pingHost() {
  try {
    const response = await chrome.runtime.sendNativeMessage(NATIVE_HOST, { action: 'ping' });
    if (chrome.runtime.lastError) {
      return { ok: false, error: chrome.runtime.lastError.message };
    }
    return { ok: true, detail: response };
  } catch (err) {
    return { ok: false, error: String(err?.message || err) };
  }
}
