function setHoverTranslateTargetLangScript(targetLang) {
  const safeTarget = WaDeckTranslateModule.normalizeTranslateTargetLang(targetLang);
  return `(() => {
    try {
      window.__waDeckHoverTranslateTargetLang = '${safeTarget}';
      const selectNode = document.querySelector('.waDeck-hover-translate-select');
      if (selectNode) selectNode.value = '${safeTarget}';
      return true;
    } catch {
      return false;
    }
  })();`;
}
