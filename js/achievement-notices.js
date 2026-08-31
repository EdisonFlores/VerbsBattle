document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const region = document.createElement("aside");
  region.className = "achievement-notices";
  region.setAttribute("aria-label", "Logros y niveles nuevos");
  region.setAttribute("aria-live", "polite");
  document.querySelector(".site-footer").before(region);
  const displayed = new Map();
  function render() {
    const pending = window.ProfileStore.listProfiles().flatMap(profile =>
      profile.progression.notifications.map(notice => ({ ...notice, profileId: profile.id, name: profile.name })));
    const keys = new Set(pending.map(n => n.profileId + ":" + n.id));
    for (const [key, element] of displayed) {
      if (!keys.has(key)) { element.remove(); displayed.delete(key); }
    }
    pending.forEach(notice => {
      const key = notice.profileId + ":" + notice.id;
      if (displayed.has(key)) return;
      const card = document.createElement("div");
      card.className = "achievement-notice";
      const text = document.createElement("p");
      text.textContent = notice.name + " · " + notice.text;
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Entendido";
      close.addEventListener("click", () => window.ProfileStore.dismissNotification(notice.profileId, notice.id));
      card.append(text, close);
      displayed.set(key, card);
      region.appendChild(card);
    });
  }
  // Se conservan hasta pulsar Entendido: navegar al resultado no pierde avisos.
  window.addEventListener("profile-progress", render);
  window.addEventListener("storage", event => { if (event.key === "verbBattleProfiles.v1") render(); });
  render();
});
