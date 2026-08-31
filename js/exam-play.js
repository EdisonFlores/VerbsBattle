document.addEventListener("DOMContentLoaded", async () => {
  "use strict";

  const { getVerbForms, normalizeText, storage } = window.GameUtils;
  try {
    await window.ProfileStore.ready();
  } catch (error) {
    document.getElementById("feedback").textContent = "No se pudieron cargar los logros. Recarga para intentarlo de nuevo.";
    document.getElementById("submitBtn").disabled = true;
    document.getElementById("skipBtn").disabled = true;
    return;
  }
  const selectedVerbs = storage.get("selectedExamVerbs", []);
  const ownerId = localStorage.getItem("selectedExamProfileId");
  if (!window.ProfileStore.getProfile(ownerId)) {
    window.location.href = "exam-select.html";
    return;
  }
  const attemptId = window.ProfileStore.newId();
  let finished = false;

  if (!Array.isArray(selectedVerbs) || selectedVerbs.length === 0) {
    alert("No hay verbos seleccionados. Volviendo a la selección.");
    window.location.href = "exam-select.html";
    return;
  }

  const verbDisplay = document.getElementById("verbDisplay");
  const answerInput = document.getElementById("answer");
  const submitButton = document.getElementById("submitBtn");
  const skipButton = document.getElementById("skipBtn");
  const feedback = document.getElementById("feedback");
  const progress = document.getElementById("progress");
  const verbImage = document.getElementById("verbImage");
  const turnTimer = document.getElementById("turnTimer");

  let currentIndex = 0;
  let correctForms = 0;
  let turnStartedAt = 0;
  let timerInterval = null;
  const details = [];

  function startTimer() {
    stopTimer(false);
    turnStartedAt = Date.now();
    timerInterval = window.setInterval(() => {
      turnTimer.textContent = `${((Date.now() - turnStartedAt) / 1000).toFixed(1)}s`;
    }, 100);
  }

  function stopTimer(calculateElapsed = true) {
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
    return calculateElapsed && turnStartedAt ? Date.now() - turnStartedAt : 0;
  }

  function showCurrentVerb() {
    const verb = selectedVerbs[currentIndex];
    verbDisplay.textContent = `Verbo (español): ${verb.meaning || ""}`;
    progress.textContent = `${currentIndex + 1} / ${selectedVerbs.length}`;
    verbImage.replaceChildren();

    if (verb.image) {
      const image = document.createElement("img");
      image.src = verb.image;
      image.alt = verb.infinitive;
      image.style.maxWidth = "180px";
      image.style.marginTop = "8px";
      verbImage.appendChild(image);
    }

    answerInput.value = "";
    feedback.textContent = "";
    turnTimer.textContent = "0.0s";
    startTimer();
    answerInput.focus();
  }

  function gradeCurrentAnswer(rawAnswer) {
    const elapsed = stopTimer();
    const verb = selectedVerbs[currentIndex];
    const expected = getVerbForms(verb);
    const given = rawAnswer.split(/\s+/).filter(Boolean);
    while (given.length < 3) given.push("");

    const marks = expected.map((form, index) => {
      const variants = String(form).split("/").map(normalizeText);
      const isCorrect = variants.includes(normalizeText(given[index]));
      if (isCorrect) correctForms++;
      return isCorrect;
    });

    details.push({
      verb: verb.infinitive,
      meaning: verb.meaning,
      expected,
      given,
      marks,
      timeMs: elapsed
    });
    window.ProfileStore.recordAnswer(ownerId, {
      id: `${attemptId}:${currentIndex}`, attemptId, mode: "examen", verb, marks, elapsedMs: elapsed
    });
  }

  function finishExam() {
    if (finished) return;
    finished = true;
    submitButton.disabled = true;
    skipButton.disabled = true;
    const totalForms = selectedVerbs.length * 3;
    const score = Math.round((correctForms / totalForms) * 100) / 10;
    window.ProfileStore.completeGame(ownerId, { id: attemptId, mode: "examen", score, expectedAnswers: selectedVerbs.length });
    storage.set("lastExamResult", {
      profileId: ownerId,
      attemptId,
      selectedVerbs,
      timestamp: Date.now(),
      totalVerbs: selectedVerbs.length,
      totalForms,
      correctForms,
      scoreOutOf10: score,
      details
    });
    window.location.href = "exam-result.html";
  }

  function advance() {
    currentIndex++;
    if (currentIndex >= selectedVerbs.length) finishExam();
    else showCurrentVerb();
  }

  submitButton.addEventListener("click", () => {
    if (finished) return;
    const answer = answerInput.value.trim();
    if (!answer) {
      feedback.textContent = "Introduce las tres formas o usa Omitir.";
      return;
    }
    gradeCurrentAnswer(answer);
    advance();
  });

  skipButton.addEventListener("click", () => {
    if (finished) return;
    gradeCurrentAnswer("");
    advance();
  });

  answerInput.addEventListener("keydown", event => {
    if (event.key === "Enter") submitButton.click();
  });

  showCurrentVerb();
});
