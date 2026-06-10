(function() {
  'use strict';

  const STATE_KEY = 'acInstantEnabled';
  let enabled = false;
  const DOWNLOAD_REGEX = /downloadContent(?:Modal)?\(\s*['"]([^'"]+)['"]\s*,\s*(\d+)\s*,\s*['"]([^'"]+)['"]/;

  function toUrl(server, legacyContentId, contentType) {
    return `https://initiate.alphacoders.com/download/${server}/${legacyContentId}/${contentType}`;
  }

  function startDownload(url) {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function removeModalIfAny() {
    const modal = document.getElementById('downloadModal');
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  function isDownloadUrl(url) {
    return typeof url === 'string' && url.includes('initiate.alphacoders.com/download/');
  }

  function patchFunctions() {
    if (window.__acInstantPatched) {
      return;
    }

    window.__acInstantPatched = true;

    const originalDownloadContent = window.downloadContent;
    if (typeof originalDownloadContent === 'function') {
      window.downloadContent = function(imageServer, contentId, contentFileType) {
        if (imageServer && contentId && contentFileType) {
          startDownload(toUrl(imageServer, contentId, contentFileType));
          return;
        }
        return originalDownloadContent.call(this, imageServer, contentId, contentFileType);
      };
    }

    const originalDownloadContentModal = window.downloadContentModal;
    if (typeof originalDownloadContentModal === 'function') {
      window.downloadContentModal = function(server, legacyContentId, contentFileType, contentTableEntryId) {
        if (server && legacyContentId && contentFileType) {
          startDownload(toUrl(server, legacyContentId, contentFileType));
          return;
        }
        return originalDownloadContentModal.call(this, server, legacyContentId, contentFileType, contentTableEntryId);
      };
    }

    const originalSetupModalFunctionality = window.setupModalFunctionality;
    if (typeof originalSetupModalFunctionality === 'function') {
      window.setupModalFunctionality = function(downloadUrl, contentTableEntryId) {
        if (isDownloadUrl(downloadUrl)) {
          startDownload(downloadUrl);
          removeModalIfAny();
          return;
        }
        return originalSetupModalFunctionality.call(this, downloadUrl, contentTableEntryId);
      };
    }

    const originalShowDownloadModal = window.showDownloadModal;
    if (typeof originalShowDownloadModal === 'function') {
      window.showDownloadModal = function(downloadUrl, contentTableEntryId) {
        if (isDownloadUrl(downloadUrl)) {
          startDownload(downloadUrl);
          return;
        }
        return originalShowDownloadModal.call(this, downloadUrl, contentTableEntryId);
      };
    }

    document.addEventListener(
      'click',
      function(e) {
        const clicked = e.target.closest
          ? e.target.closest('[onclick*="downloadContentModal"], [onclick*="downloadContent("]')
          : null;
        if (!clicked || typeof clicked.getAttribute !== 'function') {
          return;
        }

        const onclick = clicked.getAttribute('onclick') || '';
        const match = onclick.match(DOWNLOAD_REGEX);
        if (!match) {
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        const server = match[1];
        const legacyContentId = match[2];
        const contentFileType = match[3];

        if (server && legacyContentId && contentFileType) {
          startDownload(toUrl(server, legacyContentId, contentFileType));
          removeModalIfAny();
        }
      },
      true
    );
  }

  function applyIfEnabled() {
    if (!enabled) {
      return;
    }
    patchFunctions();
  }

  chrome.storage.local.get({ [STATE_KEY]: false }).then((state) => {
    enabled = !!state[STATE_KEY];
    applyIfEnabled();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[STATE_KEY]) {
      return;
    }

    enabled = !!changes[STATE_KEY].newValue;
    if (enabled) {
      patchFunctions();
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || msg.type !== 'acInstantSetEnabled') {
      return;
    }

    enabled = !!msg.enabled;
    if (enabled) {
      patchFunctions();
    }
  });
})();
