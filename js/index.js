const playerInputsContainer = document.getElementById("player-inputs-container");
const continueBtn = document.getElementById("continue-btn");
const errorMessage = document.getElementById("error-message");

const avatarModal = document.getElementById("avatar-modal");
const avatarOptionsContainer = document.getElementById("avatar-options-container");
const avatarConfirmBtn = document.getElementById("avatar-confirm-btn");
const avatarCancelBtn = document.getElementById("avatar-cancel-btn");

const helpButton = document.getElementById("help-button");
const helpInstructions = document.getElementById("help-instructions");
const savedProfiles = window.ProfileStore.listProfiles();
const savedNames = document.getElementById("saved-player-names");
savedProfiles.forEach(profile => {
  const option = document.createElement("option");
  option.value = profile.name;
  savedNames.appendChild(option);
});

let totalPlayers = 0;
let players = [];
let selectedAvatars = []; // array con los archivos usados, índice = jugador

let currentAvatarSelectIndex = null; // jugador para el que abrimos el modal
let currentSelectedAvatarFile = null;

const avatarList = [
  { name: "amarillo", emoji: "🟡", file: "avatar-amarillo.png" },
  { name: "azul", emoji: "🔵", file: "avatar-azul.png" },
  { name: "rojo", emoji: "🔴", file: "avatar-rojo.png" },
  { name: "verde", emoji: "🐍", file: "avatar-verde.png" },
  { name: "rosado", emoji: "🌸", file: "avatar-rosado.png" },
  { name: "gris", emoji: "⚪", file: "avatar-gris.png" }
];

// Al seleccionar cantidad de jugadores (máximo 4, según tus botones)
document.querySelectorAll(".player-count-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    totalPlayers = parseInt(btn.dataset.count);
    document.querySelectorAll(".player-count-btn").forEach(item => item.setAttribute("aria-pressed", String(item === btn)));

    if (totalPlayers > 4) totalPlayers = 4;  // Máximo 4 jugadores

    generatePlayerInputs(totalPlayers);
    players = Array(totalPlayers).fill().map(() => ({ name: "", avatar: null }));
    selectedAvatars = new Array(totalPlayers).fill(null);
    continueBtn.disabled = true;
    errorMessage.textContent = "";
  });
});

function generatePlayerInputs(count) {
  playerInputsContainer.innerHTML = "";

  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement("div");
    wrapper.classList.add("player-input-wrapper");

    wrapper.innerHTML = `
      <label for="player-name-${i}">Jugador ${i + 1}:</label>
      <input type="text" id="player-name-${i}" class="player-name-input" list="saved-player-names" maxlength="40" placeholder="Nombre del Jugador ${i + 1}" />
      <span id="avatar-emoji-${i}" class="avatar-emoji">🕸️</span>
      <button class="avatar-select-btn" data-player-index="${i}">Avatar</button>
    `;

    playerInputsContainer.appendChild(wrapper);
  }

  // Eventos para inputs nombre
  document.querySelectorAll(".player-name-input").forEach((input, index) => {
    input.addEventListener("input", () => {
      players[index].name = input.value.trim();
      const saved = savedProfiles.find(profile => profile.nameKey === window.ProfileStore.nameKey(input.value));
      if (saved && !selectedAvatars.some((avatar, i) => i !== index && avatar === saved.avatar)) {
        players[index].avatar = saved.avatar;
        selectedAvatars[index] = saved.avatar;
        document.getElementById(`avatar-emoji-${index}`).textContent =
          avatarList.find(avatar => avatar.file === saved.avatar)?.emoji || "🙂";
      }
      validateForm();
    });
  });

  // Botón avatar abre modal
  document.querySelectorAll(".avatar-select-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.playerIndex);
      openAvatarModal(index);
    });
  });
}

// Abre modal para seleccionar avatar de jugador index
function openAvatarModal(index) {
  currentAvatarSelectIndex = index;
  currentSelectedAvatarFile = players[index].avatar || null;
  renderAvatarOptions();
  avatarConfirmBtn.disabled = !currentSelectedAvatarFile;
  avatarModal.classList.add("show");
  avatarOptionsContainer.querySelector("img:not(.disabled)")?.focus();
}

// Muestra opciones disponibles (sin los ya usados por otros jugadores excepto el propio)
function renderAvatarOptions() {
  avatarOptionsContainer.innerHTML = "";

  // Avatares usados por otros jugadores
  const usedFiles = selectedAvatars.filter((file, idx) => file && idx !== currentAvatarSelectIndex);

  avatarList.forEach(avatar => {
    const img = document.createElement("img");
    img.src = `assets/img/ui/avatars/${avatar.file}`;
    img.alt = avatar.name;
    img.title = avatar.name;
    img.dataset.file = avatar.file;
    img.tabIndex = usedFiles.includes(avatar.file) ? -1 : 0;
    img.setAttribute("role", "button");
    img.setAttribute("aria-disabled", String(usedFiles.includes(avatar.file)));
    img.setAttribute("aria-pressed", String(avatar.file === currentSelectedAvatarFile));
    img.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); img.click(); }
    });

    if (usedFiles.includes(avatar.file)) {
      img.classList.add("disabled");
    }

    if (avatar.file === currentSelectedAvatarFile) {
      img.classList.add("selected");
    }

    img.addEventListener("click", () => {
      if (img.classList.contains("disabled")) return;
      currentSelectedAvatarFile = avatar.file;
      updateSelectedAvatarUI();
      avatarConfirmBtn.disabled = false;
    });

    avatarOptionsContainer.appendChild(img);
  });
}

// Actualiza clase selected en las imágenes
function updateSelectedAvatarUI() {
  document.querySelectorAll("#avatar-options-container img").forEach(img => {
    img.setAttribute("aria-pressed", String(img.dataset.file === currentSelectedAvatarFile));
    if (img.dataset.file === currentSelectedAvatarFile) {
      img.classList.add("selected");
    } else {
      img.classList.remove("selected");
    }
  });
}

// Confirmar avatar seleccionado
avatarConfirmBtn.addEventListener("click", () => {
  if (currentAvatarSelectIndex === null || !currentSelectedAvatarFile) return;

  players[currentAvatarSelectIndex].avatar = currentSelectedAvatarFile;
  selectedAvatars[currentAvatarSelectIndex] = currentSelectedAvatarFile;

  // Actualizamos emoji en UI
  const avatarData = avatarList.find(a => a.file === currentSelectedAvatarFile);
  if (avatarData) {
    const emojiSpan = document.getElementById(`avatar-emoji-${currentAvatarSelectIndex}`);
    emojiSpan.textContent = avatarData.emoji;
  }

  avatarModal.classList.remove("show");
  document.querySelector(`[data-player-index="${currentAvatarSelectIndex}"]`)?.focus();
  validateForm();
});

// Cancelar selección avatar
avatarCancelBtn.addEventListener("click", () => {
  avatarModal.classList.remove("show");
  document.querySelector(`[data-player-index="${currentAvatarSelectIndex}"]`)?.focus();
  currentAvatarSelectIndex = null;
  currentSelectedAvatarFile = null;
});

// Validar formulario y mostrar mensajes de error antes de habilitar continuar
function validateForm() {
  const names = players.map(player => window.ProfileStore.nameKey(player.name)).filter(Boolean);
  if (new Set(names).size !== names.length) {
    continueBtn.disabled = true;
    errorMessage.textContent = "Usa nombres distintos para no mezclar las estadísticas de los jugadores.";
    return;
  }
  const missingNameIndexes = [];
  const missingAvatarIndexes = [];

  players.forEach((p, i) => {
    if (!p.name || p.name.trim() === "") missingNameIndexes.push(i + 1);
    if (!p.avatar) missingAvatarIndexes.push(i + 1);
  });

  if (missingNameIndexes.length === 0 && missingAvatarIndexes.length === 0) {
    continueBtn.disabled = false;
    errorMessage.textContent = "";
  } else {
    continueBtn.disabled = true;

    let msg = "";
    if (missingNameIndexes.length > 0) {
      msg += `Falta nombre para jugador${missingNameIndexes.length > 1 ? "es" : ""}: ${missingNameIndexes.join(", ")}. `;
    }
    if (missingAvatarIndexes.length > 0) {
      msg += `Falta avatar para jugador${missingAvatarIndexes.length > 1 ? "es" : ""}: ${missingAvatarIndexes.join(", ")}.`;
    }
    errorMessage.textContent = msg.trim();
  }
}

// Continuar hacia el juego con validación extra
continueBtn.addEventListener("click", () => {
  validateForm();

  if (continueBtn.disabled) {
    // Ya hay mensaje de error visible, no hacemos nada más
    return;
  }

  const playerData = players.map(p => ({
    name: p.name,
    avatar: p.avatar
  }));

  window.ProfileStore.preparePlayers(playerData);
  window.location.href = "mode-select.html"; // Ajusta según tu ruta
});

// Botón ayuda toggle
helpButton.addEventListener("click", () => {
  if (helpInstructions.style.display === "none" || helpInstructions.style.display === "") {
    helpInstructions.style.display = "block";
  } else {
    helpInstructions.style.display = "none";
  }

});

avatarModal.addEventListener("keydown", event => {
  if (event.key === "Escape") avatarCancelBtn.click();
  if (event.key !== "Tab") return;
  const items = [...avatarModal.querySelectorAll('img[tabindex="0"],button:not(:disabled)')];
  const first = items[0], last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

const creditsBtn = document.getElementById("credits-btn");
const aboutProject = document.getElementById("about-project");
if (creditsBtn && aboutProject) {
  creditsBtn.addEventListener("click", () => {
    aboutProject.hidden = !aboutProject.hidden;
    creditsBtn.setAttribute("aria-expanded", String(!aboutProject.hidden));
  });
}
