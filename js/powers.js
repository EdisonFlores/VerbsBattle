(function () {
  "use strict";
  const POWERS = Object.freeze({
    double: { name: "Doble puntuación", description: "Duplica los puntos de tu próxima respuesta." },
    hint: { name: "Pista de iniciales", description: "Muestra la inicial de cada forma del verbo actual." },
    reverse: { name: "Invertir turnos", description: "Cambia el sentido de los siguientes turnos." }
  });
  function create(random = Math.random) {
    const state = new Map();
    const get = id => state.get(id) || { streak: 0, power: null, multiplier: 1 };
    function record(id, perfect) {
      const item = get(id);
      item.streak = perfect ? item.streak + 1 : 0;
      let unlocked = null;
      if (item.streak >= 3 && !item.power) {
        const ids = Object.keys(POWERS);
        item.power = ids[Math.floor(random() * ids.length)];
        item.streak = 0;
        unlocked = item.power;
      }
      state.set(id, item);
      return unlocked;
    }
    function activate(id) {
      const item = get(id);
      const power = item.power;
      if (!power) return null;
      item.power = null;
      if (power === "double") item.multiplier = 2;
      state.set(id, item);
      return power;
    }
    function takeMultiplier(id) {
      const item = get(id);
      const value = item.multiplier;
      item.multiplier = 1;
      state.set(id, item);
      return value;
    }
    return Object.freeze({ record, activate, takeMultiplier, pending: id => get(id).power, definition: id => POWERS[id] || null });
  }
  window.PowerSystem = Object.freeze({ create, POWERS });
})();
