const stateKey = 'acInstantEnabled';
const toggleBtn = document.getElementById('toggleBtn');
const supportBtn = document.getElementById('supportBtn');
const statusText = document.getElementById('statusText');
const helpText = document.getElementById('helpText');
const supportUrl = 'https://buymeacoffee.com/voidksa';

function isAlphacodersSite(url = '') {
  try {
    return new URL(url).hostname.endsWith('.alphacoders.com') || url.includes('alphacoders.com');
  } catch {
    return false;
  }
}

function setUi(enabled) {
  if (enabled) {
    toggleBtn.textContent = 'Disable Instant Download';
    toggleBtn.classList.remove('off');
    statusText.className = 'status on';
    statusText.innerHTML = '<span class="dot"></span><span class="state">Instant Download is active</span>';
  } else {
    toggleBtn.textContent = 'Enable Instant Download';
    toggleBtn.classList.add('off');
    statusText.className = 'status off';
    statusText.innerHTML = '<span class="dot"></span><span class="state">Instant Download is inactive</span>';
  }
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (!tabs || !tabs[0]) {
        reject(new Error('No active tab found.'));
        return;
      }
      resolve(tabs[0]);
    });
  });
}

function syncContentScript(tabId, enabled) {
  chrome.tabs.sendMessage(tabId, { type: 'acInstantSetEnabled', enabled }).catch(() => {});
}

function setHelpMessage(enabled, onSite) {
  if (!onSite) {
    helpText.innerHTML = 'Works on wall, avatars, mobile, gifs, and supported Alphacoders pages.';
    return;
  }

  helpText.innerHTML = enabled
    ? 'Click <b>Free Download</b> and the download will start immediately.'
    : 'Enable it to skip the 5-second wait on supported downloads.';
}

async function init() {
  const store = await chrome.storage.local.get({ [stateKey]: false });
  const enabled = !!store[stateKey];
  setUi(enabled);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[stateKey]) {
      setUi(!!changes[stateKey].newValue);
      const state = !!changes[stateKey].newValue;
      getActiveTab()
        .then((tab) => {
          setHelpMessage(state, isAlphacodersSite(tab.url || ''));
        })
        .catch(() => {});
    }
  });

  try {
    const tab = await getActiveTab();
    const onAlphacoders = isAlphacodersSite(tab.url || '');
    setHelpMessage(enabled, onAlphacoders);
    if (onAlphacoders) {
      syncContentScript(tab.id, enabled);
    }
  } catch (err) {
    helpText.textContent = 'Unable to detect current tab.';
  }

  toggleBtn.addEventListener('click', async () => {
    const current = (await chrome.storage.local.get({ [stateKey]: false }))[stateKey];
    const next = !current;

    await chrome.storage.local.set({ [stateKey]: next });
    setUi(next);

    try {
      const activeTab = await getActiveTab();
      setHelpMessage(next, isAlphacodersSite(activeTab.url || ''));
      if (isAlphacodersSite(activeTab.url || '')) {
        syncContentScript(activeTab.id, next);
      }
    } catch {
      helpText.textContent = 'Unable to communicate with the active tab.';
    }
  });

  supportBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: supportUrl });
  });
}

init().catch((err) => {
  statusText.className = 'status off';
  statusText.textContent = `Error: ${err.message}`;
});
