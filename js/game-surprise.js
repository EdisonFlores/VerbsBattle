document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const { getAvatarPath, getVerbForms, loadJson, normalizeText, storage } = window.GameUtils;
  const difficulty = localStorage.getItem("selectedDifficulty");
  const selectedTurns = Number.parseInt(localStorage.getItem("selectedTurns") || "10", 10);
  let players = storage.get("players", []);
  if (!difficulty || !Number.isInteger(selectedTurns) || selectedTurns <= 0) { window.location.href = "mode-select.html"; return; }
  if (!Array.isArray(players) || !players.length) { window.location.href = "index.html"; return; }
  try { await window.ProfileStore.ready(); players = window.ProfileStore.preparePlayers(players); }
  catch (error) { alert(error.message); window.location.href = "index.html"; return; }
  const attemptId = window.ProfileStore.newId();
  const el = id => document.getElementById(id);
  const labels = ["infinitivo", "pasado", "participio"];
  let verbs = [], currentVerb, order = [], currentPlayerIndex = 0, completedTurns = 0, turnStartedAt = 0, finished = false;
  el("selected-difficulty-display").textContent = `Dificultad: ${difficulty}`;
  function player() { return players[currentPlayerIndex]; }
  function updatePlayer() { const current = player(); el("player-name-display").textContent = current.name; el("player-avatar").src = getAvatarPath(current.avatar); el("player-avatar").alt = `Avatar de ${current.name}`; el("player-score-value").textContent = current.score; el("player-score-value").className = "value " + (current.score >= 0 ? "green" : "red"); }
  function randomOrder() { return [0, 1, 2].sort(() => Math.random() - .5); }
  function startTurn() {
    el("round-progress").textContent = `Ronda ${Math.floor(completedTurns / players.length) + 1} de ${selectedTurns} · Jugador ${currentPlayerIndex + 1} de ${players.length}`;
    currentVerb = verbs[Math.floor(Math.random() * verbs.length)]; order = randomOrder(); el("answer").value = ""; el("feedback").textContent = ""; el("next-verb").hidden = true; el("submit-answer").disabled = false;
    el("verb").textContent = `Verbo en español: ${currentVerb.meaning || currentVerb.spanish || ""}`;
    el("surprise-banner").textContent = "✨ Orden sorpresa: cada reto cambia el orden de las formas.";
    el("order-instructions").textContent = `Escribe: ${order.map(index => labels[index]).join(" → ")}`; updatePlayer(); turnStartedAt = Date.now(); el("answer").focus();
  }
  function grade() {
    if (finished || !currentVerb || el("submit-answer").disabled) return;
    const given = normalizeText(el("answer").value).split(/\s+/).filter(Boolean);
    if (given.length !== 3) { el("feedback").textContent = "Escribe exactamente las tres formas en el orden indicado."; return; }
    const forms = getVerbForms(currentVerb).map(normalizeText);
    const marks = forms.map((form, formIndex) => { const inputIndex = order.indexOf(formIndex); return form.split("/").map(normalizeText).includes(given[inputIndex]); });
    const delta = marks.reduce((sum, mark) => sum + (mark ? 10 : -5), 0); const current = player(); current.score += delta;
    window.ProfileStore.recordAnswer(current.profileId, { id: `${attemptId}:${completedTurns}`, attemptId, mode: "sorpresa", verb: currentVerb, marks, elapsedMs: Date.now() - turnStartedAt });
    storage.set("players", players); el("feedback").textContent = `${marks.filter(Boolean).length} de 3 formas correctas. ${delta >= 0 ? "+" : ""}${delta} puntos.`;
    el("feedback").textContent += `\nRespuesta en el orden pedido: ${order.map(index => getVerbForms(currentVerb)[index]).join(" · ")}`;
    el("score-animation").textContent = `${delta >= 0 ? "+" : ""}${delta}`; el("score-animation").style.color = delta >= 0 ? "#4caf50" : "#ff4d4d"; el("score-animation").style.animation = "none"; void el("score-animation").offsetWidth; el("score-animation").style.animation = "";
    updatePlayer(); el("submit-answer").disabled = true; el("next-verb").hidden = false;
  }
  function finish() { if (finished) return; finished = true; players.forEach(item => window.ProfileStore.completeGame(item.profileId, { id: attemptId, mode: "sorpresa", score: item.score, expectedAnswers: selectedTurns })); storage.set("podioDatos", { modo: "sorpresa", jugadores: players.map(item => ({ name: item.name, profileId: item.profileId, score: item.score, avatar: item.avatar })) }); window.location.href = "podium.html"; }
  el("submit-answer").addEventListener("click", grade); el("answer").addEventListener("keydown", event => { if (event.key === "Enter") el("submit-answer").disabled ? el("next-verb").click() : grade(); });
  el("next-verb").addEventListener("click", () => { if (finished || !currentVerb || el("next-verb").hidden || !el("submit-answer").disabled) return; completedTurns++; if (completedTurns >= selectedTurns * players.length) finish(); else { currentPlayerIndex = (currentPlayerIndex + 1) % players.length; startTurn(); } });
  try { const data = await loadJson("data/verbs.json"); verbs = data[normalizeText(difficulty)] || []; if (!verbs.length) throw new Error("Sin verbos"); startTurn(); } catch (error) { console.error(error); el("feedback").textContent = "No se pudo cargar la base de verbos."; }
});
