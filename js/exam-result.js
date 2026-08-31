document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const { storage } = window.GameUtils;
  const result = storage.get("lastExamResult", null);

  if (!result || !Array.isArray(result.details)) {
    alert("No hay resultados disponibles.");
    window.location.href = "exam-select.html";
    return;
  }

  const summary = document.getElementById("summary");
  const detailBody = document.querySelector("#tableResult tbody");
  const historyBlock = document.getElementById("historyTable");
  const savedHistory = storage.get("examHistory", []);
  const history = Array.isArray(savedHistory) ? savedHistory : [];
  document.getElementById("result-profile").href = result.profileId
    ? "profile.html?player=" + encodeURIComponent(result.profileId) : "profile.html";

  if (!history.some(item => item.timestamp === result.timestamp)) {
    history.push(result);
    storage.set("examHistory", history);
  }

  const summaryText = document.createElement("p");
  summaryText.textContent =
    `Verbos: ${result.totalVerbs} — Formas: ${result.totalForms} — ` +
    `Correctas: ${result.correctForms} — Nota: ${Number(result.scoreOutOf10).toFixed(1)} / 10`;
  summary.replaceChildren(summaryText);

  result.details.forEach((detail, index) => {
    const row = document.createElement("tr");
    appendCell(row, index + 1);
    appendCell(row, detail.verb);
    appendCell(row, detail.meaning || "");

    for (let formIndex = 0; formIndex < 3; formIndex++) {
      const cell = appendCell(row, detail.given[formIndex] || "—");
      cell.className = detail.marks[formIndex] ? "right" : "wrong";
      if (!detail.marks[formIndex]) {
        const correction = document.createElement("div");
        correction.style.color = "#aaa";
        correction.style.fontSize = "0.85rem";
        correction.textContent = `(${detail.expected[formIndex]})`;
        cell.appendChild(correction);
      }
    }

    appendCell(row, (Number(detail.timeMs) / 1000).toFixed(1));
    detailBody.appendChild(row);
  });

  renderHistory(result.profileId ? history.filter(item => item.profileId === result.profileId) : history.filter(item => !item.profileId));

  document.getElementById("retry").addEventListener("click", () => {
    if (result.profileId) localStorage.setItem("selectedExamProfileId", result.profileId);
    if (Array.isArray(result.selectedVerbs)) storage.set("selectedExamVerbs", result.selectedVerbs);
    const selected = storage.get("selectedExamVerbs", []);
    if (!Array.isArray(selected) || selected.length === 0) {
      alert("No hay verbos seleccionados para reintentar.");
      window.location.href = "exam-select.html";
      return;
    }
    window.location.href = "exam-play.html";
  });

  document.getElementById("back").addEventListener("click", () => {
    window.location.href = "exam-select.html";
  });

  function appendCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = String(value ?? "");
    row.appendChild(cell);
    return cell;
  }

  function renderHistory(items) {
    if (!Array.isArray(items) || items.length === 0) {
      const empty = document.createElement("p");
      empty.style.color = "#999";
      empty.textContent = "Aún no hay historial de intentos.";
      historyBlock.replaceChildren(empty);
      return;
    }

    const table = document.createElement("table");
    const header = document.createElement("tr");
    ["#", "Fecha", "Verbos", "Correctas", "Nota"].forEach(label => {
      const cell = document.createElement("th");
      cell.textContent = label;
      header.appendChild(cell);
    });
    table.appendChild(header);

    items.slice(-5).reverse().forEach((item, index) => {
      const row = document.createElement("tr");
      appendCell(row, index + 1);
      appendCell(row, new Date(item.timestamp).toLocaleString());
      appendCell(row, item.totalVerbs);
      appendCell(row, `${item.correctForms}/${item.totalForms}`);
      appendCell(row, `${Number(item.scoreOutOf10).toFixed(1)} / 10`);
      table.appendChild(row);
    });

    historyBlock.replaceChildren(table);
  }
});
