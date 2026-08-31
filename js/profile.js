document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const store = window.ProfileStore;
  const select = document.getElementById("profile-select");
  const content = document.getElementById("profile-content");
  const message = document.getElementById("profile-message");
  let config;
  try { config = await store.ready(); }
  catch (error) {
    message.textContent = "No se pudieron cargar los logros. Recarga para intentarlo de nuevo.";
    return;
  }
  const labels = { normal: "Clásico", flash: "Flash", puzzle: "Puzzle", sorpresa: "Sorpresa", examen: "Examen" };
  let selectedId = new URLSearchParams(window.location.search).get("player") ||
    localStorage.getItem("activeProfileId");

  function fillList(id, items, emptyText) {
    const list = document.getElementById(id);
    list.replaceChildren();
    (items.length ? items : [emptyText]).forEach(text => {
      const item = document.createElement("li");
      item.textContent = text;
      list.appendChild(item);
    });
  }

  function render() {
    const profiles = store.listProfiles();
    select.replaceChildren();
    profiles.forEach(profile => {
      const option = document.createElement("option");
      option.value = profile.id;
      option.textContent = profile.name;
      select.appendChild(option);
    });
    const profile = profiles.find(item => item.id === selectedId) || profiles[0];
    select.disabled = !profile;
    content.hidden = !profile;
    if (!profile) {
      message.textContent = "Todavía no hay perfiles. Registra un jugador desde el menú para empezar.";
      return;
    }
    selectedId = profile.id;
    select.value = selectedId;
    window.history.replaceState(null, "", "profile.html?player=" + encodeURIComponent(selectedId));
    localStorage.setItem("activeProfileId", selectedId);
    message.textContent = "";
    const stats = profile.stats;
    const p = profile.progression;
    const level = window.Progression.levelInfo(p.xp);
    document.getElementById("level-title").textContent = `Nivel ${level.current.level} · ${level.current.title}`;
    document.getElementById("xp-summary").textContent = `${p.xp} XP acumulados`;
    document.getElementById("xp-progress").value = level.percent;
    document.getElementById("xp-next").textContent = level.next ?
      `${level.next.exp_required - p.xp} XP para el nivel ${level.next.level}` : "¡Nivel máximo alcanzado! Puedes seguir acumulando XP.";
    const achievementList = document.getElementById("achievement-list");
    achievementList.replaceChildren();
    config.achievements.forEach(achievement => {
      const unlocked = p.unlocked[achievement.id];
      const card = document.createElement("li");
      card.className = "achievement-card" + (unlocked ? " unlocked" : "");
      const title = document.createElement("h3");
      title.textContent = achievement.icon + " " + achievement.name;
      const description = document.createElement("p");
      description.textContent = achievement.description;
      const status = document.createElement("small");
      status.textContent = unlocked ? "✓ Desbloqueado · " + new Date(unlocked).toLocaleDateString("es") :
        achievement.condition.practice_played ? `${p.practiceRounds} / ${achievement.condition.practice_played} rondas de práctica` : "🔒 Bloqueado";
      card.append(title, description, status);
      achievementList.appendChild(card);
    });
    document.getElementById("player-name").textContent = profile.name;
    const avatar = document.getElementById("profile-avatar");
    avatar.src = window.GameUtils.getAvatarPath(profile.avatar);
    avatar.alt = "Avatar de " + profile.name;
    document.getElementById("profile-since").textContent = "Perfil creado el " + new Date(profile.createdAt).toLocaleDateString("es");
    document.getElementById("games-played").textContent = stats.gamesPlayed;
    document.getElementById("best-score").textContent = stats.bestScore === null ? "—" : stats.bestScore + " pts";
    document.getElementById("best-exam-score").textContent = stats.bestExamScore === null ? "—" : stats.bestExamScore.toFixed(1) + " / 10";
    document.getElementById("accuracy").textContent = stats.totalForms ? (100 * stats.correctForms / stats.totalForms).toFixed(1) + "%" : "—";
    document.getElementById("forms-count").textContent = stats.correctForms + " de " + stats.totalForms + " formas";
    document.getElementById("answered-verbs").textContent = stats.answeredVerbs;
    document.getElementById("average-speed").textContent = stats.answeredVerbs ? (stats.totalTimeMs / stats.answeredVerbs / 1000).toFixed(2) + " s" : "—";
    const maxCount = Math.max(...Object.values(stats.modeCounts));
    document.getElementById("most-played-mode").textContent = maxCount ? Object.entries(stats.modeCounts).filter(([, count]) => count === maxCount).map(([mode]) => labels[mode]).join(" / ") : "Ninguno";
    fillList("mode-counts", Object.entries(labels).map(([mode, label]) => label + ": " + stats.modeCounts[mode] + " finalizadas"));
    const verbs = Object.values(stats.verbs);
    const review = profile.review;
    document.getElementById("practice-stats").textContent = `${review.rounds} rondas de práctica · ${review.correctForms} de ${review.totalForms} formas correctas · ${Object.keys(review.pending).length} pendientes`;
    fillList("pending-verbs", Object.values(review.pending).map(verb => `${verb.infinitive} — ${verb.meaning || ""}`), "No tienes errores pendientes de repaso.");
    document.getElementById("review-link").href = "study.html?source=review&player=" + encodeURIComponent(profile.id);
    document.getElementById("study-link").href = "study.html?player=" + encodeURIComponent(profile.id);
    fillList("most-answered-verbs", verbs.filter(verb => verb.correct > 0).sort((a, b) => b.correct - a.correct || a.infinitive.localeCompare(b.infinitive)).slice(0, 5).map(verb => verb.infinitive + " — " + verb.correct + " respuestas completas"), "Aún no hay respuestas completamente correctas.");
    fillList("missed-verbs", verbs.filter(verb => verb.wrong > 0).sort((a, b) => b.wrong - a.wrong || a.infinitive.localeCompare(b.infinitive)).map(verb => verb.infinitive + " (" + verb.meaning + ") — " + verb.wrong + " respuestas con errores"), "No hay errores registrados.");
  }

  select.addEventListener("change", () => {
    selectedId = select.value;
    render();
  });
  document.getElementById("reset-profile").addEventListener("click", () => {
    const profile = store.getProfile(selectedId);
    if (!profile || !confirm("¿Reiniciar estadísticas, XP, nivel, logros y pendientes de repaso de " + profile.name + "? Su nombre y avatar se conservarán. Los demás jugadores no se modificarán.")) return;
    store.resetStats(selectedId);
    render();
    message.textContent = "Las estadísticas, XP y logros de este jugador se reiniciaron.";
  });
  window.addEventListener("storage", event => {
    if (event.key === "verbBattleProfiles.v1") render();
  });
  render();
});
