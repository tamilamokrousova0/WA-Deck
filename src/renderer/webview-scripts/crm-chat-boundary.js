function crmChatBoundaryScript() {
  return `(() => {
    const main = document.querySelector('#main');
    if (!main) return 0;
    const rect = main.getBoundingClientRect();
    if (!rect || !Number.isFinite(rect.left)) return 0;
    return Math.max(0, Math.round(rect.left));
  })();`;
}
