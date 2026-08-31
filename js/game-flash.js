document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const {
    getAvatarPath,
    getVerbForms,
    loadJson,
    normalizeText,
    storage
  } = window.GameUtils;

  const selectedMode = localStorage.getItem("selectedMode");
  const difficulty = localStorage.getItem("selectedDifficulty");
  const maxTurns = Number.parseInt(localStorage.getItem("selectedTurns") || "10", 10);
  let players = storage.get("players", []);

  if (!selectedMode || !difficulty || !Number.isFinite(maxTurns) || maxTurns <= 0) {
    window.location.href = "mode-select.html";
    return;
  }

  if (!Array.isArray(players) || players.length < 2) {
    alert("El modo Flash necesita al menos dos jugadores.");
    window.location.href = "index.html";
    return;
  }

  try {
    await window.ProfileStore.ready();
    players = window.ProfileStore.preparePlayers(players);
  } catch (error) {
    alert(error.message);
    window.location.href = "index.html";
    return;
  }
  const attemptId = window.ProfileStore.newId();
  let finished = false;

  const verbDisplay = document.getElementById("verb");
  const answerInput = document.getElementById("answer");
  const submitButton = document.getElementById("submit-answer");
  const nextButton = document.getElementById("next-verb");
  const feedbackDisplay = document.getElementById("feedback");
  const playerNameDisplay = document.getElementById("player-name-display");
  const scoreValue = document.getElementById("player-score-value");
  const avatarImage = document.getElementById("player-avatar");
  const scoreAnimation = document.getElementById("score-animation");
  const difficultyDisplay = document.getElementById("selected-difficulty-display");
  const powerStatus = document.getElementById("power-status");
  const usePowerButton = document.getElementById("use-power");

  let verbs = [];
  let currentVerb = null;
  let currentPlayerIndex = 0;
  let turnStartTime = 0;
  const turnCounts = Array(players.length).fill(0);
  const previousFailed = storage.get("failedVerbs", []);
  const failedVerbs = Array.isArray(previousFailed) ? previousFailed : [];
  const powers = window.PowerSystem.create();
  let direction = 1;

  difficultyDisplay.textContent = `Dificultad: ${difficulty}`;
  submitButton.disabled = true;

  avatarImage.addEventListener("error", () => {
    const fallback = getAvatarPath(null);
    if (!avatarImage.src.endsWith(fallback)) avatarImage.src = fallback;
  });

  function currentPlayer() {
    return players[currentPlayerIndex];
  }

  function updatePlayerDisplay() {
    const player = currentPlayer();
    playerNameDisplay.textContent = player.name || "Jugador";
    avatarImage.src = getAvatarPath(player.avatar);
    avatarImage.alt = `Avatar de ${player.name || "Jugador"}`;
    scoreValue.textContent = player.score;
    scoreValue.classList.remove("green", "red");
    scoreValue.classList.add(player.score >= 0 ? "green" : "red");
  }

  function animateScoreChange(delta) {
    scoreAnimation.textContent = `${delta > 0 ? "+" : ""}${delta}`;
    scoreAnimation.style.color = delta > 0 ? "#4caf50" : "#ff4d4d";
    scoreAnimation.style.animation = "none";
    void scoreAnimation.offsetWidth;
    scoreAnimation.style.animation = "";
  }

  function startTurn() {
    document.getElementById("round-progress").textContent = `Ronda ${turnCounts[currentPlayerIndex] + 1} de ${maxTurns} · Jugador ${currentPlayerIndex + 1} de ${players.length}`;
    currentVerb = verbs[Math.floor(Math.random() * verbs.length)];
    answerInput.value = "";
    feedbackDisplay.textContent = "";
    feedbackDisplay.style.color = "";
    submitButton.disabled = false;
    nextButton.style.display = "none";
    verbDisplay.textContent = `Verbo en español: ${currentVerb.meaning || currentVerb.spanish || ""}`;
    updatePlayerDisplay();
    renderPower();
    turnStartTime = Date.now();
    answerInput.focus();
  }

  function renderPower(message = "") {
    const player = currentPlayer();
    const power = powers.pending(player.profileId);
    usePowerButton.hidden = !power || submitButton.disabled;
    usePowerButton.disabled = !power || submitButton.disabled;
    if (power) {
      const definition = powers.definition(power);
      usePowerButton.textContent = `Usar: ${definition.name}`;
      powerStatus.textContent = message || `${player.name}: ${definition.description}`;
    } else {
      powerStatus.textContent = message || `${player.name}: encadena 3 respuestas perfectas para conseguir un poder.`;
    }
  }

  function checkAnswer() {
    if (finished || !currentVerb || submitButton.disabled) return;

    const inputParts = normalizeText(answerInput.value).split(/\s+/);
    if (inputParts.length !== 3) {
      feedbackDisplay.style.color = "#ffaaaa";
      feedbackDisplay.textContent = "Debes ingresar las tres formas.";
      return;
    }

    const player = currentPlayer();
    const elapsedMs = Date.now() - turnStartTime;
    player.timeSpent += elapsedMs;
    turnStartTime = 0;

    const correctForms = getVerbForms(currentVerb).map(normalizeText);
    let points = 0;
    const feedback = [];

    correctForms.forEach((form, index) => {
      const given = inputParts[index];
      const variants = form.split("/").map(normalizeText);
      const expected = variants[0];

      if (variants.includes(given)) {
        points += 10;
        feedback.push(`<span class="correct-answer">✅ ${expected}</span> <span class="point blue">+10</span>`);
      } else {
        points -= 5;
        feedback.push(`<span class="incorrect-answer">❌ ${window.GameUtils.escapeHtml(given || "(vacío)")} ➜ ${expected}</span> <span class="point orange">-5</span>`);
      }
    });

    const multiplier = powers.takeMultiplier(player.profileId);
    if (multiplier > 1) {
      points *= multiplier;
      feedback.push(`<span class="point blue">⚡ Doble puntuación ×${multiplier}</span>`);
    }
    player.score += points;
    window.ProfileStore.recordAnswer(player.profileId, {
      id: `${attemptId}:${currentPlayerIndex}:${turnCounts[currentPlayerIndex]}`,
      attemptId, mode: "flash",
      verb: currentVerb,
      marks: correctForms.map((form, index) => form.split("/").map(normalizeText).includes(inputParts[index])),
      elapsedMs
    });
    if (points < 30 && !failedVerbs.some(verb => verb.infinitive === currentVerb.infinitive)) {
      failedVerbs.push(currentVerb);
      storage.set("failedVerbs", failedVerbs);
    }

    storage.set("players", players);
    const perfect = correctForms.every((form, index) => form.split("/").map(normalizeText).includes(inputParts[index]));
    const unlocked = powers.record(player.profileId, perfect);
    feedbackDisplay.innerHTML = feedback.join("<br>");
    animateScoreChange(points);
    updatePlayerDisplay();
    submitButton.disabled = true;
    nextButton.style.display = "inline-block";
    renderPower(unlocked ? `✨ ${player.name} consiguió: ${powers.definition(unlocked).name}. Úsalo en su próximo turno.` : "");
  }

  usePowerButton.addEventListener("click", () => {
    if (finished || submitButton.disabled) return;
    const player = currentPlayer();
    const power = powers.activate(player.profileId);
    if (!power) return;
    if (power === "hint") {
      const initials = getVerbForms(currentVerb).map(form => String(form).trim().charAt(0).toUpperCase() || "—");
      renderPower(`Pista: ${initials.join(" · ")}. Esta ayuda no añade ni quita puntos.`);
    } else if (power === "reverse") {
      direction *= -1;
      renderPower("↔ Orden invertido para los siguientes turnos.");
    } else {
      renderPower("⚡ Doble puntuación activada para esta respuesta.");
    }
    usePowerButton.hidden = true;
  });

  function finishGame() {
    if (finished) return;
    finished = true;
    players.forEach(player => window.ProfileStore.completeGame(player.profileId, {
      id: attemptId, mode: "flash", score: player.score, expectedAnswers: maxTurns
    }));
    storage.set("podioDatos", {
      modo: selectedMode,
      jugadores: players.map(player => ({
        name: player.name || "Jugador",
        profileId: player.profileId,
        score: Number(player.score) || 0,
        avatar: player.avatar || null,
        timeSpent: Number(player.timeSpent) || 0
      }))
    });
    storage.set("players", players);
    window.location.href = "podium.html";
  }

  nextButton.addEventListener("click", () => {
    if (finished || !submitButton.disabled || !currentVerb) return;
    turnCounts[currentPlayerIndex]++;
    if (turnCounts.every(turns => turns >= maxTurns)) {
      finishGame();
      return;
    }

    do {
      currentPlayerIndex = (currentPlayerIndex + direction + players.length) % players.length;
    } while (turnCounts[currentPlayerIndex] >= maxTurns);

    startTurn();
  });

  submitButton.addEventListener("click", checkAnswer);
  answerInput.addEventListener("keydown", event => {
    if (event.key !== "Enter") return;
    if (!submitButton.disabled) checkAnswer();
    else if (nextButton.style.display !== "none") nextButton.click();
  });

  try {
    const data = await loadJson("data/verbs.json");
    verbs = data[normalizeText(difficulty)] || [];
    if (verbs.length === 0) {
      throw new Error("No hay verbos para la dificultad seleccionada.");
    }
    startTurn();
  } catch (error) {
    console.error(error);
    feedbackDisplay.textContent = "No se pudo cargar la base de verbos.";
  }
});
