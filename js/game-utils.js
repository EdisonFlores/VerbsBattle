(function () {
  "use strict";

  const DEFAULT_AVATAR = "avatar-gris.png";
  const AVATAR_BASE_PATH = "assets/img/ui/avatars/";

  function cloneFallback(fallback) {
    if (Array.isArray(fallback)) return [...fallback];
    if (fallback && typeof fallback === "object") return { ...fallback };
    return fallback;
  }

  const storage = {
    get(key, fallback) {
      const raw = localStorage.getItem(key);
      if (raw === null) return cloneFallback(fallback);

      try {
        return JSON.parse(raw);
      } catch (error) {
        console.warn(`Dato local inválido en "${key}".`, error);
        return cloneFallback(fallback);
      }
    },

    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },

    remove(key) {
      localStorage.removeItem(key);
    }
  };

  function normalizeText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function getVerbForms(verb) {
    return [
      verb?.infinitive ?? "",
      verb?.past ?? "",
      verb?.pastParticiple ?? verb?.past_participle ?? ""
    ];
  }

  function getAvatarPath(avatar) {
    if (typeof avatar === "string" && avatar.startsWith("assets/")) {
      return avatar;
    }
    return `${AVATAR_BASE_PATH}${avatar || DEFAULT_AVATAR}`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  async function loadJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} al cargar ${url}`);
    }
    return response.json();
  }

  function formatDuration(milliseconds) {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "—";

    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  window.GameUtils = Object.freeze({
    DEFAULT_AVATAR,
    escapeHtml,
    formatDuration,
    getAvatarPath,
    getVerbForms,
    loadJson,
    normalizeText,
    storage
  });
})();
