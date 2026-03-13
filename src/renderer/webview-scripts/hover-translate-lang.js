function setHoverTranslateTargetLangScript(targetLang) {
  const safeTarget = WaDeckTranslateModule.normalizeTranslateTargetLang(targetLang);
  const escaped = JSON.stringify(safeTarget);
  return `(() => {
    try {
      window.__waDeckHoverTranslateTargetLang = ${escaped};
      const selectNode = document.querySelector('.waDeck-hover-translate-select');
      if (selectNode) selectNode.value = ${escaped};
      return true;
    } catch {
      return false;
    }
  })();`;
}
