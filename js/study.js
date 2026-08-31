document.addEventListener("DOMContentLoaded", async () => {
  "use strict";
  const { getVerbForms, loadJson, normalizeText } = window.GameUtils;
  const store = window.ProfileStore;
  const el = id => document.getElementById("study-" + id);
  let catalog = [];
  let session = null;
  const profiles = store.listProfiles();
  if (!profiles.length) {
    el("message").textContent = "Registra un jugador desde el menú antes de estudiar.";
    return;
  }
  try {
    const [, all, game] = await Promise.all([store.ready(), loadJson("data/all_verbs.json"), loadJson("data/verbs.json")]);
    const seen = new Set();
    for (const data of [all, game]) {
      for (const difficulty of ["facil", "medio", "dificil"]) {
        for (const verb of Array.isArray(data[difficulty]) ? data[difficulty] : []) {
          if (seen.has(verb.infinitive) || !getVerbForms(verb).every(form => typeof form === "string" && form.trim())) continue;
          seen.add(verb.infinitive);
          catalog.push({ ...verb, difficulty });
        }
      }
    }
    if (!catalog.length) throw new Error("Catálogo vacío");
  } catch (error) {
    el("message").textContent = "No se pudieron cargar los verbos o los logros. Recarga para volver a intentarlo.";
    return;
  }
  profiles.forEach(profile => {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.name;
    el("player").appendChild(option);
  });
  const params = new URLSearchParams(window.location.search);
  const preferred = params.get("player") || localStorage.getItem("activeProfileId");
  if (profiles.some(profile => profile.id === preferred)) el("player").value = preferred;
  if (params.get("source") === "review") el("source").value = "review";
  el("message").textContent = "";
  el("settings").hidden = false;

  function available() {
    const profile = store.getProfile(el("player").value);
    const pending = Object.values(profile?.review.pending || {});
    let verbs = catalog;
    if (el("source").value === "review") {
      verbs = pending.map(verb => catalog.find(item => item.infinitive === verb.infinitive) || verb)
        .filter(verb => getVerbForms(verb).every(form => typeof form === "string" && form.trim()));
    }
    const query = normalizeText(el("search").value);
    const filtered = verbs.filter(verb => (el("difficulty").value === "all" || verb.difficulty === el("difficulty").value) &&
      normalizeText([verb.meaning, verb.spanish, ...getVerbForms(verb)].join(" ")).includes(query));
    return { filtered, pending: pending.length, unavailable: el("source").value === "review" ? pending.length - verbs.length : 0 };
  }
  function refresh() {
    const result = available();
    el("available").textContent = `${result.filtered.length} verbos disponibles · ${result.pending} pendientes de repaso.` +
      (result.unavailable ? ` ${result.unavailable} pendientes no tienen formas completas en el catálogo; se conservan.` : "") +
      (!result.filtered.length ? " No hay tarjetas para estos filtros." : "");
    el("start").disabled = !result.filtered.length;
  }
  ["player", "source", "difficulty", "count"].forEach(id => el(id).addEventListener("change", refresh));
  el("search").addEventListener("input", refresh);

  function showCard() {
    const verb = session.verbs[session.index];
    session.answered = false;
    el("position").textContent = `${session.name} · Tarjeta ${session.index + 1} de ${session.verbs.length}`;
    el("meaning").textContent = verb.meaning || verb.spanish || verb.infinitive;
    el("answer").value = "";
    el("feedback").textContent = "";
    ["answer", "check", "reveal", "skip"].forEach(id => el(id).disabled = false);
    el("next").hidden = true;
    el("answer").focus();
  }
  function lockCard(text) {
    session.answered = true;
    ["answer", "check", "reveal", "skip"].forEach(id => el(id).disabled = true);
    el("feedback").textContent = text;
    el("next").hidden = false;
    el("next").textContent = session.index + 1 === session.verbs.length ? "Ver resumen" : "Siguiente tarjeta";
    el("next").focus();
  }
  el("start").addEventListener("click", () => {
    const profile = store.getProfile(el("player").value);
    const verbs = [...available().filtered];
    if (!profile || !verbs.length) return;
    for (let i = verbs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [verbs[i], verbs[j]] = [verbs[j], verbs[i]];
    }
    session = { id: store.newId(), profileId: profile.id, name: profile.name,
      verbs: verbs.slice(0, Number(el("count").value)), index: 0, answered: false, rounds: 0, correct: 0, viewed: 0, xp: 0 };
    localStorage.setItem("activeProfileId", profile.id);
    el("settings").hidden = true;
    el("summary").hidden = true;
    el("session").hidden = false;
    showCard();
  });
  function submit(skip) {
    if (!session || session.answered) return;
    const parts = normalizeText(el("answer").value).split(/\s+/).filter(Boolean);
    if (!skip && parts.length !== 3) { el("feedback").textContent = "Escribe las tres formas separadas por espacios o utiliza Omitir."; return; }
    const verb = session.verbs[session.index];
    const forms = getVerbForms(verb);
    const marks = forms.map((form, i) => !skip && form.split("/").map(normalizeText).includes(parts[i]));
    const saved = store.recordPractice(session.profileId, { id: `${session.id}:${session.index}`, verb, marks });
    if (!saved) { el("feedback").textContent = "No se pudo registrar la respuesta."; return; }
    const count = marks.filter(Boolean).length;
    session.rounds++;
    session.correct += count;
    session.xp += count * 5;
    lockCard(`${skip ? "Omitido." : count + " de 3 formas correctas."} +${count * 5} XP\n` +
      forms.map((form, i) => `${marks[i] ? "✓" : "✗"} ${form}`).join("\n") +
      (count === 3 ? "\nVerbo resuelto: ya no está en pendientes." : "\nEste verbo queda pendiente de repaso."));
  }
  el("form").addEventListener("submit", event => { event.preventDefault(); submit(false); });
  el("skip").addEventListener("click", () => submit(true));
  el("reveal").addEventListener("click", () => {
    if (!session || session.answered) return;
    session.viewed++;
    lockCard(getVerbForms(session.verbs[session.index]).join(" · ") + "\nTarjeta de estudio: sin XP, sin ronda de práctica y sin resolver pendientes.");
  });
  function finish() {
    if (!session) return;
    el("session").hidden = true;
    el("summary").hidden = false;
    el("result").textContent = `${session.name}: ${session.rounds} rondas respondidas, ${session.correct} de ${session.rounds * 3} formas correctas, ` +
      `${session.viewed} tarjetas consultadas y +${session.xp} XP. Tus respuestas ya están guardadas. No se añaden partidas competitivas ni bonos por finalizar.`;
    el("profile").href = "profile.html?player=" + encodeURIComponent(session.profileId);
    session = null;
  }
  el("next").addEventListener("click", () => {
    if (!session || !session.answered) return;
    session.index++;
    if (session.index >= session.verbs.length) finish(); else showCard();
  });
  el("end").addEventListener("click", finish);
  el("again").addEventListener("click", () => {
    el("summary").hidden = true;
    el("settings").hidden = false;
    refresh();
  });
  refresh();
});
