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
  const meaning = document.getElementById("puzzle-meaning");
  const bank = document.getElementById("puzzle-bank");
  const slots = document.getElementById("puzzle-slots");
  const check = document.getElementById("check-puzzle");
  const next = document.getElementById("next-verb");
  const feedback = document.getElementById("feedback");
  const avatar = document.getElementById("player-avatar");
  const name = document.getElementById("player-name-display");
  const score = document.getElementById("player-score-value");
  const animation = document.getElementById("score-animation");
  let verbs = [], currentVerb, ordered = [], currentPlayerIndex = 0, completedTurns = 0, finished = false, graded = false, turnStartedAt = 0;
  document.getElementById("selected-difficulty-display").textContent = `Dificultad: ${difficulty}`;
  function player() { return players[currentPlayerIndex]; }
  function updatePlayer() {
    const current = player(); name.textContent = current.name; avatar.src = getAvatarPath(current.avatar); avatar.alt = `Avatar de ${current.name}`;
    score.textContent = current.score; score.className = "value " + (current.score >= 0 ? "green" : "red");
  }
  function shuffle(items) { return items.map(value => ({ value, sort: Math.random() })).sort((a,b) => a.sort-b.sort).map(item => item.value); }
  function render() {
    bank.replaceChildren(); slots.replaceChildren();
    const labels = ["1. Infinitivo", "2. Pasado", "3. Participio"];
    labels.forEach((label, index) => {
      const slot = document.createElement("button"); slot.type = "button"; slot.className = "puzzle-slot" + (ordered[index] ? " filled" : "");
      slot.textContent = ordered[index]?.value || label;
      slot.setAttribute("aria-label", `${label}: ${ordered[index]?.value || "vacío"}`);
      slot.disabled = graded;
      slot.addEventListener("click", () => { if (!graded && ordered[index]) { ordered[index] = null; render(); } });
      slot.addEventListener("dragover", event => event.preventDefault());
      slot.addEventListener("drop", event => { event.preventDefault(); place(event.dataTransfer.getData("text/plain"), index); });
      slots.appendChild(slot);
    });
    Array.from(bank.children).forEach(card => card.remove());
    const remaining = currentVerb._options.filter(option => !ordered.some(item => item?.key === option.key));
    remaining.forEach(option => bank.appendChild(makeCard(option)));
    check.disabled = graded || ordered.some(value => !value);
  }
  function makeCard(option) {
    const card = document.createElement("button"); card.type = "button"; card.className = "puzzle-card"; card.draggable = true; card.textContent = option.value;
    card.addEventListener("click", () => place(option.key, ordered.findIndex(item => !item)));
    card.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", option.key)); return card;
  }
  function place(key, index) { if (graded || !currentVerb) return; const option = currentVerb._options.find(item => item.key === key); if (index < 0 || !option || ordered.some(item => item?.key === key)) return; ordered[index] = option; render(); }
  function startTurn() {
    graded = false; turnStartedAt = Date.now();
    document.getElementById("round-progress").textContent = `Ronda ${Math.floor(completedTurns / players.length) + 1} de ${selectedTurns} · Jugador ${currentPlayerIndex + 1} de ${players.length}`;
    currentVerb = { ...verbs[Math.floor(Math.random() * verbs.length)] };
    currentVerb._options = shuffle(getVerbForms(currentVerb).map((value, index) => ({ key: `${index}:${value}`, value }))); ordered = [null, null, null]; feedback.textContent = ""; next.hidden = true; check.hidden = false;
    meaning.textContent = `Verbo en español: ${currentVerb.meaning || currentVerb.spanish || ""}`; updatePlayer(); render();
  }
  function grade() {
    if (finished || graded || !currentVerb || check.disabled) return;
    graded = true;
    const forms = getVerbForms(currentVerb).map(normalizeText);
    const marks = forms.map((form, index) => form === normalizeText(ordered[index].value) || form.split("/").map(normalizeText).includes(normalizeText(ordered[index].value)));
    const delta = marks.reduce((total, correct) => total + (correct ? 10 : -5), 0);
    const current = player(); current.score += delta;
    window.ProfileStore.recordAnswer(current.profileId, { id: `${attemptId}:${completedTurns}`, attemptId, mode: "puzzle", verb: currentVerb, marks, elapsedMs: Date.now() - turnStartedAt });
    storage.set("players", players); feedback.textContent = `${marks.filter(Boolean).length} de 3 posiciones correctas. ${delta >= 0 ? "+" : ""}${delta} puntos.`;
    animation.textContent = `${delta >= 0 ? "+" : ""}${delta}`; animation.style.color = delta >= 0 ? "#4caf50" : "#ff4d4d"; animation.style.animation = "none"; void animation.offsetWidth; animation.style.animation = "";
    feedback.textContent += `\nOrden correcto: ${getVerbForms(currentVerb).join(" → ")}`;
    updatePlayer(); render(); check.hidden = true; next.hidden = false; next.focus();
  }
  function finish() {
    if (finished) return; finished = true;
    players.forEach(item => window.ProfileStore.completeGame(item.profileId, { id: attemptId, mode: "puzzle", score: item.score, expectedAnswers: selectedTurns }));
    storage.set("podioDatos", { modo: "puzzle", jugadores: players.map(item => ({ name: item.name, profileId: item.profileId, score: item.score, avatar: item.avatar })) });
    window.location.href = "podium.html";
  }
  check.addEventListener("click", grade);
  next.addEventListener("click", () => { if (finished || !check.hidden) return; completedTurns++; if (completedTurns >= selectedTurns * players.length) finish(); else { currentPlayerIndex = (currentPlayerIndex + 1) % players.length; startTurn(); } });
  try { const data = await loadJson("data/verbs.json"); verbs = data[normalizeText(difficulty)] || []; if (!verbs.length) throw new Error("Sin verbos"); startTurn(); }
  catch (error) { console.error(error); feedback.textContent = "No se pudo cargar la base de verbos."; }
});
