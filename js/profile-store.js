(function () {
  "use strict";

  const { storage } = window.GameUtils;
  const KEY = "verbBattleProfiles.v1";
  const modes = ["normal", "flash", "puzzle", "sorpresa", "examen"];
  const progression = window.Progression;
  function emptyReview() { return { pending: {}, rounds: 0, correctForms: 0, totalForms: 0 }; }
  function ensureReview(profile) {
    if (profile.review) return;
    profile.review = emptyReview();
    // Los errores históricos pertenecen a este perfil. Nunca usar failedVerbs global.
    Object.values(profile.stats.verbs).filter(verb => verb.wrong > 0).forEach(verb => {
      profile.review.pending["verb:" + verb.infinitive] = { infinitive: verb.infinitive, meaning: verb.meaning };
    });
  }
  function updateReview(profile, answer) {
    const key = "verb:" + answer.verb.infinitive;
    if (answer.marks.every(mark => mark === true)) delete profile.review.pending[key];
    else profile.review.pending[key] = { ...answer.verb };
  }
  function changed() {
    if (window.dispatchEvent) window.dispatchEvent(new Event("profile-progress"));
  }

  function emptyStats() {
    return {
      gamesPlayed: 0, bestScore: null, bestExamScore: null,
      modeCounts: { normal: 0, flash: 0, puzzle: 0, sorpresa: 0, examen: 0 },
      answeredVerbs: 0, correctForms: 0, totalForms: 0, totalTimeMs: 0,
      verbs: {}
    };
  }

  function read() {
    const data = storage.get(KEY, { version: 1, profiles: [] });
    if (!data || data.version !== 1 || !Array.isArray(data.profiles)) return { version: 1, profiles: [] };
    data.profiles.forEach(profile => {
      profile.stats.modeCounts = { normal: 0, flash: 0, puzzle: 0, sorpresa: 0, examen: 0, ...(profile.stats.modeCounts || {}) };
      progression.ensure(profile);
    });
    data.profiles.forEach(ensureReview);
    return data;
  }

  function nameKey(name) {
    return String(name || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
  }

  function newId() {
    return window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  // Un mismo nombre recupera su perfil local. Cada asiento de una partida
  // debe tener un nombre distinto para no mezclar sus estadísticas.
  function preparePlayers(players, resetScores = true) {
    if (!Array.isArray(players) || players.length === 0) return [];
    const keys = players.map(player => nameKey(player.name));
    if (keys.some(key => !key) || new Set(keys).size !== keys.length) {
      throw new Error("Cada jugador debe tener un nombre distinto y no vacío.");
    }

    const data = read();
    const prepared = players.map(player => {
      const key = nameKey(player.name);
      let profile = data.profiles.find(item => item.nameKey === key);
      if (!profile) {
        profile = {
          id: newId(), name: player.name.trim(), nameKey: key,
          avatar: player.avatar || "avatar-gris.png", createdAt: Date.now(),
          stats: emptyStats(), answerIds: [], completedIds: [], progression: progression.empty(), review: emptyReview()
        };
        data.profiles.push(profile);
      }
      profile.name = player.name.trim();
      profile.avatar = player.avatar || profile.avatar;
      profile.updatedAt = Date.now();
      return {
        ...player, profileId: profile.id, name: profile.name, avatar: profile.avatar,
        score: resetScores ? 0 : Number(player.score) || 0,
        timeSpent: resetScores ? 0 : Number(player.timeSpent) || 0
      };
    });
    storage.set(KEY, data);
    storage.set("players", prepared);
    localStorage.setItem("activeProfileId", prepared[0].profileId);
    return prepared;
  }

  function listProfiles() {
    return read().profiles;
  }

  function getProfile(id) {
    return listProfiles().find(profile => profile.id === id) || null;
  }

  function recordAnswer(profileId, answer) {
    const data = read();
    const profile = data.profiles.find(item => item.id === profileId);
    if (!profile || !answer.id || !answer.verb?.infinitive || !Array.isArray(answer.marks) || answer.marks.length !== 3) return false;
    if (profile.answerIds.includes(answer.id)) return false;

    const stats = profile.stats;
    const correct = answer.marks.filter(Boolean).length;
    const elapsed = Number.isFinite(answer.elapsedMs) ? Math.max(0, answer.elapsedMs) : 0;
    stats.answeredVerbs++;
    stats.totalForms += 3;
    stats.correctForms += correct;
    stats.totalTimeMs += elapsed;

    // Prefijo para que nombres especiales no colisionen con propiedades heredadas.
    const key = `verb:${answer.verb.infinitive}`;
    const verb = stats.verbs[key] || {
      infinitive: answer.verb.infinitive, meaning: answer.verb.meaning || "",
      attempts: 0, correct: 0, wrong: 0, correctForms: 0
    };
    verb.attempts++;
    verb.correctForms += correct;
    if (correct === 3) verb.correct++;
    else verb.wrong++;
    stats.verbs[key] = verb;

    profile.answerIds.push(answer.id);
    updateReview(profile, answer);
    progression.answer(profile, answer);
    profile.updatedAt = Date.now();
    storage.set(KEY, data);
    localStorage.setItem("activeProfileId", profileId);
    changed();
    return true;
  }

  function completeGame(profileId, game) {
    const data = read();
    const profile = data.profiles.find(item => item.id === profileId);
    if (!profile || !game.id || !modes.includes(game.mode) || !Number.isFinite(game.score)) return false;
    if (profile.completedIds.includes(game.id)) return false;

    const stats = profile.stats;
    stats.gamesPlayed++;
    stats.modeCounts[game.mode]++;
    if (game.mode === "examen") {
      stats.bestExamScore = stats.bestExamScore === null ? game.score : Math.max(stats.bestExamScore, game.score);
    } else {
      stats.bestScore = stats.bestScore === null ? game.score : Math.max(stats.bestScore, game.score);
    }
    profile.completedIds.push(game.id);
    progression.complete(profile, game);
    profile.updatedAt = Date.now();
    storage.set(KEY, data);
    changed();
    return true;
  }

  function recordPractice(profileId, answer) {
    const data = read();
    const profile = data.profiles.find(item => item.id === profileId);
    if (!profile || !answer.id || !answer.verb?.infinitive || answer.assisted ||
        !Array.isArray(answer.marks) || answer.marks.length !== 3 ||
        !answer.marks.every(mark => typeof mark === "boolean") || profile.answerIds.includes(answer.id)) return false;
    profile.answerIds.push(answer.id);
    profile.review.rounds++;
    profile.review.totalForms += 3;
    profile.review.correctForms += answer.marks.filter(Boolean).length;
    updateReview(profile, answer);
    progression.practice(profile, answer);
    profile.updatedAt = Date.now();
    storage.set(KEY, data);
    localStorage.setItem("activeProfileId", profileId);
    changed();
    return true;
  }

  function dismissNotification(profileId, id) {
    const data = read();
    const profile = data.profiles.find(item => item.id === profileId);
    if (!profile) return;
    profile.progression.notifications = profile.progression.notifications.filter(item => item.id !== id);
    storage.set(KEY, data);
    changed();
  }

  // Solo reinicia este perfil. Se conservan los IDs para que una pantalla
  // antigua no vuelva a contabilizar resultados anteriores al reinicio.
  function resetStats(profileId) {
    const data = read();
    const profile = data.profiles.find(item => item.id === profileId);
    if (!profile) return false;
    profile.stats = emptyStats();
    profile.progression = progression.empty();
    profile.review = emptyReview();
    profile.updatedAt = Date.now();
    storage.set(KEY, data);
    changed();
    return true;
  }

  window.ProfileStore = Object.freeze({
    nameKey, newId, preparePlayers, listProfiles, getProfile,
    recordAnswer, recordPractice, completeGame, resetStats, dismissNotification, ready: progression.ready
  });
})();
