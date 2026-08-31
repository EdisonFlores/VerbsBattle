document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const { storage } = window.GameUtils;
  const players = storage.get("players", []);

  if (!Array.isArray(players) || players.length === 0) {
    window.location.href = "index.html";
    return;
  }

  const modeButtons = document.querySelectorAll(".mode-btn");
  const difficultyButtons = document.querySelectorAll(".diff-btn");
  const startButton = document.getElementById("start-game");
  const flashButton = document.getElementById("flash-mode");
  const countModal = document.getElementById("verbCountModal");
  const status = document.getElementById("mode-status");
  const difficultySection = document.querySelector(".difficulty");
  const routes = {
    normal: "game-classic.html",
    flash: "game-flash.html",
    examen: "exam-select.html",
    estudio: "study.html",
    puzzle: "game-puzzle.html",
    sorpresa: "game-surprise.html"
  };

  let selectedMode = null;
  let selectedDifficulty = null;

  if (players.length < 2) {
    flashButton.disabled = true;
    flashButton.title = "Se necesitan al menos 2 jugadores para este modo.";
  }

  modeButtons.forEach(button => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      modeButtons.forEach(item => { item.classList.remove("selected"); item.setAttribute("aria-pressed", "false"); });
      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
      selectedMode = button.dataset.mode.toLowerCase();
      difficultySection.hidden = ["examen", "estudio"].includes(selectedMode);
      status.textContent = difficultySection.hidden ? "Configurarás tu sesión en la siguiente pantalla." : "";
    });
  });

  difficultyButtons.forEach(button => {
    button.addEventListener("click", () => {
      difficultyButtons.forEach(item => { item.classList.remove("selected"); item.setAttribute("aria-pressed", "false"); });
      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
      selectedDifficulty = button.dataset.difficulty;
      status.textContent = "";
    });
  });

  startButton.addEventListener("click", () => {
    if (!selectedMode) {
      status.textContent = "Selecciona un modo de juego para continuar.";
      return;
    }

    if (!["examen", "estudio"].includes(selectedMode) && !selectedDifficulty) {
      status.textContent = "Selecciona una dificultad para continuar.";
      return;
    }

    localStorage.setItem("selectedMode", selectedMode);
    if (selectedDifficulty) {
      localStorage.setItem("selectedDifficulty", selectedDifficulty);
    } else {
      localStorage.removeItem("selectedDifficulty");
    }

    if (["normal", "flash", "puzzle", "sorpresa"].includes(selectedMode)) {
      countModal.style.display = "flex";
      countModal.querySelector("button").focus();
      return;
    }

    redirectToSelectedMode();
  });

  function closeCountModal() {
    countModal.style.display = "none";
    startButton.focus();
  }
  document.getElementById("cancel-round-count").addEventListener("click", closeCountModal);
  countModal.addEventListener("click", event => { if (event.target === countModal) closeCountModal(); });
  countModal.addEventListener("keydown", event => {
    if (event.key === "Escape") closeCountModal();
    if (event.key !== "Tab") return;
    const buttons = [...countModal.querySelectorAll("button")];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  document.querySelectorAll(".count-btn").forEach(button => {
    button.addEventListener("click", () => {
      localStorage.setItem("selectedTurns", button.dataset.count);
      redirectToSelectedMode();
    });
  });

  function redirectToSelectedMode() {
    const target = routes[selectedMode];
    if (!target) {
      alert("Modo no soportado aún.");
      return;
    }
    window.location.href = target;
  }
});
