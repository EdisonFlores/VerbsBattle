document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const { formatDuration, getAvatarPath, storage } = window.GameUtils;
  const podiumData = storage.get("podioDatos", {});
  const container = document.getElementById("podium");
  const players = Array.isArray(podiumData.jugadores) ? podiumData.jugadores : [];

  if (players.length === 0) {
    const message = document.createElement("p");
    message.textContent = "No hay datos disponibles del podio.";
    container.appendChild(message);
    return;
  }

  let previousPlayer = null;
  let previousPosition = 0;
  const rankedPlayers = [...players]
    .map(player => ({
      ...player,
      score: Number(player.score) || 0,
      totalTime: Number(player.timeSpent) || 0
    }))
    .sort((first, second) =>
      second.score - first.score || first.totalTime - second.totalTime
    )
    .map((player, index) => {
      const isTie =
        previousPlayer &&
        player.score === previousPlayer.score &&
        player.totalTime === previousPlayer.totalTime;
      const position = isTie ? previousPosition : index + 1;
      previousPlayer = player;
      previousPosition = position;
      return { ...player, position };
    });

  const iconPaths = {
    1: "M7 21h10v-2H7v2zm5-19c-1.104 0-2 .896-2 2v3h4V4c0-1.104-.896-2-2-2zm6 6v3c0 2.206-1.794 4-4 4h-2c-2.206 0-4-1.794-4-4v-3H4v3c0 3.309 2.691 6 6 6h4c3.309 0 6-2.691 6-6v-3h-3z",
    2: "M12 2a7 7 0 100 14 7 7 0 000-14zm0 12a5 5 0 110-10 5 5 0 010 10zm0 4l-2 3h4l-2-3z",
    3: "M12 2a7 7 0 107 7 7 7 0 00-7-7zm0 10a3 3 0 113-3 3 3 0 01-3 3zm0 6l-3 3h6l-3-3z"
  };

  rankedPlayers.forEach((player, index) => {
    const card = document.createElement("div");
    card.classList.add("player-card", `player-${index + 1}`);

    const icon = createAwardIcon(player.position, iconPaths[player.position]);
    if (icon) card.appendChild(icon);

    const avatar = document.createElement("img");
    avatar.src = getAvatarPath(player.avatar);
    avatar.alt = `Avatar de ${player.name || "Jugador"}`;
    avatar.loading = "lazy";
    avatar.addEventListener("error", () => {
      const fallback = getAvatarPath(null);
      if (!avatar.src.endsWith(fallback)) avatar.src = fallback;
    });

    const name = document.createElement("h2");
    name.textContent = player.name || "Jugador";
    const score = document.createElement("p");
    score.textContent = `Puntos: ${player.score}`;
    const time = document.createElement("p");
    time.textContent = `Tiempo: ${formatDuration(player.totalTime)}`;
    card.append(avatar, name, score, time);
    if (player.profileId) {
      const profileLink = document.createElement("a");
      profileLink.href = "profile.html?player=" + encodeURIComponent(player.profileId);
      profileLink.textContent = "Ver estadísticas";
      profileLink.style.color = "#83d4ff";
      card.appendChild(profileLink);
    }

    if (index === 3) {
      const thanks = document.createElement("div");
      thanks.className = "award-thanks";
      thanks.textContent = "¡Gracias por participar!";
      card.appendChild(thanks);
    }

    container.appendChild(card);
  });

  document.getElementById("restart-btn").addEventListener("click", () => {
    storage.remove("podioDatos");
    window.location.href = "index.html";
  });

  function createAwardIcon(position, pathData) {
    if (!pathData) return null;
    const namespace = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(namespace, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.classList.add(
      "award-icon",
      position === 1 ? "award-trophy" : position === 2 ? "award-medal-silver" : "award-medal-bronze"
    );
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", pathData);
    icon.appendChild(path);
    return icon;
  }
});
