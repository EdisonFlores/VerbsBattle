document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const {
    getAvatarPath,
    getVerbForms,
    loadJson,
    normalizeText,
    storage
  } = window.GameUtils;

  const difficulty = localStorage.getItem("selectedDifficulty");
  const selectedTurns = Number.parseInt(localStorage.getItem("selectedTurns") || "20", 10);
  let players = storage.get("players", []);

  if (!difficulty || !Number.isFinite(selectedTurns) || selectedTurns <= 0) {
    window.location.href = "mode-select.html";
    return;
  }

  if (!Array.isArray(players) || players.length === 0) {
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
  let turnStartedAt = 0;
  let finished = false;

  const difficultyDisplay = document.getElementById("selected-difficulty-display");
  const verbDisplay = document.getElementById("verb");
  const answerInput = document.getElementById("answer");
  const submitButton = document.getElementById("submit-answer");
  const nextButton = document.getElementById("next-verb");
  const feedbackDisplay = document.getElementById("feedback");
  const playerNameDisplay = document.getElementById("player-name-display");
  const avatarImage = document.getElementById("player-avatar");
  const scoreValue = document.getElementById("player-score-value");
  const scoreAnimation = document.getElementById("score-animation");

  let verbs = [];
  let currentVerb = null;
  let completedTurns = 0;
  let currentPlayerIndex = 0;

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
    updateScoreDisplay(player.score);
  }

  function updateScoreDisplay(score) {
    scoreValue.textContent = score;
    scoreValue.classList.remove("green", "red");
    scoreValue.classList.add(score >= 0 ? "green" : "red");
  }

  function animateScoreChange(delta) {
    scoreAnimation.textContent = `${delta > 0 ? "+" : ""}${delta}`;
    scoreAnimation.style.color = delta > 0 ? "#4caf50" : "#ff4d4d";
    scoreAnimation.style.animation = "none";
    void scoreAnimation.offsetWidth;
    scoreAnimation.style.animation = "";
    scoreAnimation.classList.add("show");
  }

  function startTurn() {
    document.getElementById("round-progress").textContent = `Ronda ${Math.floor(completedTurns / players.length) + 1} de ${selectedTurns} · Jugador ${currentPlayerIndex + 1} de ${players.length}`;
    currentVerb = verbs[Math.floor(Math.random() * verbs.length)];
    answerInput.value = "";
    feedbackDisplay.textContent = "";
    feedbackDisplay.style.color = "";
    submitButton.disabled = false;
    nextButton.style.display = "none";
    verbDisplay.textContent = `Verbo en español: ${currentVerb.meaning || currentVerb.spanish || ""}`;
    updatePlayerDisplay();
    turnStartedAt = Date.now();
    answerInput.focus();
  }

  function checkAnswer() {
    if (finished || !currentVerb || submitButton.disabled) return;

    const inputParts = normalizeText(answerInput.value).split(/\s+/);
    if (inputParts.length !== 3) {
      feedbackDisplay.style.color = "#ffaaaa";
      feedbackDisplay.textContent = "Debes ingresar las tres formas.";
      return;
    }

    const correctForms = getVerbForms(currentVerb).map(normalizeText);
    let points = 0;
    const feedback = [];

    correctForms.forEach((form, index) => {
      const given = inputParts[index];
      const variants = form.split("/").map(normalizeText);
      const expected = variants[0];

      if (variants.includes(given)) {
        points += 10;
        feedback.push(`<span class="correct-answer">${expected}</span><span class="point blue">+10</span>`);
      } else {
        points -= 5;
        feedback.push(
          `<span class="incorrect-answer"><span class="x-icon">❌</span>${window.GameUtils.escapeHtml(given || "(vacío)")}</span>` +
          ` <span class="arrow">➜</span> <span class="correct-answer">${expected}</span>` +
          `<span class="point orange">-5</span>`
        );
      }
    });

    const player = currentPlayer();
    player.score += points;
    window.ProfileStore.recordAnswer(player.profileId, {
      id: `${attemptId}:${completedTurns}`,
      attemptId, mode: "normal",
      verb: currentVerb,
      marks: correctForms.map((form, index) => form.split("/").map(normalizeText).includes(inputParts[index])),
      elapsedMs: Date.now() - turnStartedAt
    });
    storage.set("players", players);

    feedbackDisplay.innerHTML = feedback.join("<br>");
    animateScoreChange(points);
    updateScoreDisplay(player.score);
    submitButton.disabled = true;
    nextButton.style.display = "inline-block";
  }

  function finishGame() {
    if (finished) return;
    finished = true;
    players.forEach(player => window.ProfileStore.completeGame(player.profileId, {
      id: attemptId, mode: "normal", score: player.score, expectedAnswers: selectedTurns
    }));
    storage.set("podioDatos", {
      modo: "normal",
      jugadores: players.map(player => ({
        name: player.name || "Jugador",
        profileId: player.profileId,
        score: Number(player.score) || 0,
        avatar: player.avatar || null
      }))
    });
    storage.set("players", players);
    window.location.href = "podium.html";
  }

  nextButton.addEventListener("click", () => {
    if (finished || !submitButton.disabled || !currentVerb) return;
    completedTurns++;
    if (completedTurns >= selectedTurns * players.length) {
      finishGame();
      return;
    }

    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
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
