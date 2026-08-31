document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const { getVerbForms, loadJson, normalizeText, storage } = window.GameUtils;
  const searchInput = document.getElementById("searchInput");
  const verbList = document.getElementById("verbList");
  const selectedList = document.getElementById("selectedList");
  const startExamButton = document.getElementById("startExam");
  const playerSelect = document.getElementById("exam-player");
  const currentPlayers = storage.get("players", []);
  if (Array.isArray(currentPlayers) && currentPlayers.length) {
    try {
      window.ProfileStore.preparePlayers(currentPlayers, false);
    } catch (error) {
      console.warn(error.message);
    }
  }
  const profiles = window.ProfileStore.listProfiles();
  if (!profiles.length) {
    alert("Registra un jugador antes de comenzar el examen.");
    window.location.href = "index.html";
    return;
  }
  profiles.forEach(profile => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    playerSelect.appendChild(option);
  });
  const activeId = localStorage.getItem("activeProfileId");
  if (profiles.some(profile => profile.id === activeId)) playerSelect.value = activeId;

  let allVerbs = [];
  const selectedVerbs = [];

  function renderVerbList(filter = "") {
    verbList.replaceChildren();
    const normalizedFilter = normalizeText(filter);
    const filtered = allVerbs.filter(verb =>
      normalizeText(verb.meaning).includes(normalizedFilter)
    );

    if (filtered.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No se encontraron verbos.";
      verbList.appendChild(empty);
      return;
    }

    filtered.forEach(verb => {
      const row = document.createElement("div");
      row.className = "verb-item";

      const info = document.createElement("div");
      info.className = "verb-info";

      const values = [verb.meaning, ...getVerbForms(verb)];
      values.forEach((value, index) => {
        const span = document.createElement("span");
        if (index === 0) {
          const strong = document.createElement("strong");
          strong.textContent = value;
          span.appendChild(strong);
        } else {
          span.textContent = value;
        }
        info.appendChild(span);
      });

      const button = document.createElement("button");
      button.className = "add-btn";
      const isSelected = selectedVerbs.some(item => item.infinitive === verb.infinitive);
      button.textContent = isSelected ? "Quitar" : "Agregar";
      button.classList.toggle("added", isSelected);
      button.addEventListener("click", () => toggleVerb(verb));

      row.append(info, button);
      verbList.appendChild(row);
    });
  }

  function toggleVerb(verb) {
    const index = selectedVerbs.findIndex(item => item.infinitive === verb.infinitive);
    if (index >= 0) selectedVerbs.splice(index, 1);
    else selectedVerbs.push(verb);

    renderVerbList(searchInput.value);
    renderSelectedVerbs();
  }

  function renderSelectedVerbs() {
    selectedList.replaceChildren();
    if (selectedVerbs.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "No has seleccionado verbos.";
      selectedList.appendChild(empty);
      return;
    }

    selectedVerbs.forEach(verb => {
      const item = document.createElement("li");
      item.textContent = `${verb.meaning} — ${getVerbForms(verb).join(", ")}`;
      selectedList.appendChild(item);
    });
  }

  searchInput.addEventListener("input", event => renderVerbList(event.target.value));
  startExamButton.addEventListener("click", () => {
    if (selectedVerbs.length === 0) {
      alert("Selecciona al menos un verbo para comenzar el examen.");
      return;
    }

    storage.set("selectedExamVerbs", selectedVerbs);
    localStorage.setItem("selectedExamProfileId", playerSelect.value);
    localStorage.setItem("activeProfileId", playerSelect.value);
    window.location.href = "exam-play.html";
  });

  renderSelectedVerbs();
  try {
    const data = await loadJson("data/all_verbs.json");
    allVerbs = [
      ...(Array.isArray(data.facil) ? data.facil : []),
      ...(Array.isArray(data.medio) ? data.medio : []),
      ...(Array.isArray(data.dificil) ? data.dificil : [])
    ];
    renderVerbList();
  } catch (error) {
    console.error("Error al cargar verbos:", error);
    const message = document.createElement("p");
    message.className = "empty";
    message.textContent = "No se pudo cargar la base de verbos.";
    verbList.replaceChildren(message);
    startExamButton.disabled = true;
  }
});
