document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  function wrapTables() {
    document.querySelectorAll("table").forEach(table => {
      if (table.parentElement.classList.contains("table-scroll")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-scroll";
      wrapper.tabIndex = 0;
      wrapper.setAttribute("role", "region");
      wrapper.setAttribute("aria-label", "Tabla de resultados; desplazamiento horizontal disponible");
      table.before(wrapper);
      wrapper.appendChild(table);
    });
  }
  wrapTables();
  const main = document.querySelector("main");
  if (main) new MutationObserver(wrapTables).observe(main, { childList: true, subtree: true });
});
