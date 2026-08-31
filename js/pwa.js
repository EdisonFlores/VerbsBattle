(() => {
  'use strict';
  const footer = document.querySelector('.site-footer');
  if (!footer) return;
  const panel = document.createElement('div');
  const status = document.createElement('p');
  status.id = 'pwa-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  const install = document.createElement('button');
  install.type = 'button'; install.className = 'secondary';
  install.textContent = 'Instalar Verb Battle'; install.hidden = true;
  panel.append(status, install); footer.appendChild(panel);
  let promptEvent, ready = false, update = false;
  function render() {
    status.textContent = update
      ? 'Actualización lista. Al terminar, cierra todas las pestañas de Verb Battle y vuelve a abrirlo.'
      : ready ? 'Listo para jugar sin conexión. Tu progreso se guarda en este navegador.'
      : 'Preparando los recursos para jugar sin conexión…';
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); promptEvent = event; install.hidden = false;
  });
  install.addEventListener('click', async () => {
    if (!promptEvent) return;
    const current = promptEvent; promptEvent = null; install.hidden = true;
    try { await current.prompt(); await current.userChoice; }
    catch { status.textContent = 'Puedes instalar Verb Battle desde el menú del navegador.'; }
  });
  window.addEventListener('appinstalled', () => { install.hidden = true; promptEvent = null; });
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.textContent = 'El modo sin conexión requiere HTTPS o localhost y un navegador compatible.';
    return;
  }
  render();
  navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' }).then(registration => {
    if (registration.active) { ready = true; render(); }
    if (registration.waiting) { update = true; render(); }
    function observe(worker) {
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) { update = true; render(); }
        if (worker.state === 'redundant' && !ready) status.textContent = 'No se completó la descarga. Conéctate y recarga para habilitar el modo sin conexión.';
      });
    }
    observe(registration.installing);
    registration.addEventListener('updatefound', () => observe(registration.installing));
    navigator.serviceWorker.ready.then(() => { ready = true; render(); });
  }).catch(() => {
    status.textContent = 'El modo sin conexión no está disponible todavía. Ejecuta la compilación y recarga con conexión.';
  });
})();
