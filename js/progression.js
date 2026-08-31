(function () {
  "use strict";
  let config;
  let loading;
  function ready() {
    if (!loading) loading = window.GameUtils.loadJson("data/achievements.json").then(data => {
      if (!Array.isArray(data.levels) || !data.levels.length || data.levels[0].exp_required !== 0 ||
          !data.levels.every((level, i) => Number.isInteger(level.level) && Number.isFinite(level.exp_required) &&
            (i === 0 || level.exp_required > data.levels[i - 1].exp_required)) || !Array.isArray(data.achievements)) {
        throw new Error("Configuración de logros inválida.");
      }
      config = data;
      return data;
    });
    return loading;
  }
  function empty() {
    return { xp: 0, correctVerbs: 0, bestStreak: 0, fastestMs: null,
      perfectGames: 0, practiceRounds: 0, unlocked: {}, attempt: null, notifications: [] };
  }
  function ensure(profile) {
    if (!profile.progression) profile.progression = empty();
    if (!Number.isInteger(profile.progression.practiceRounds)) profile.progression.practiceRounds = 0;
    return profile.progression;
  }
  function levelInfo(xp) {
    if (!config) throw new Error("Los logros todavía no se han cargado.");
    const current = [...config.levels].reverse().find(level => xp >= level.exp_required);
    const next = config.levels[config.levels.indexOf(current) + 1] || null;
    return { current, next, percent: next ? Math.min(100, Math.max(0,
      100 * (xp - current.exp_required) / (next.exp_required - current.exp_required))) : 100 };
  }
  function notify(p, id, text) {
    p.notifications.push({ id, text });
  }
  function evaluate(p, previousXp) {
    for (const achievement of config.achievements) {
      if (p.unlocked[achievement.id]) continue;
      const c = achievement.condition;
      const reached = c.correct !== undefined ? p.correctVerbs >= c.correct :
        c.streak !== undefined ? p.bestStreak >= c.streak :
        c.response_time !== undefined ? p.fastestMs !== null && p.fastestMs < c.response_time * 1000 :
        c.no_mistakes === true ? p.perfectGames > 0 :
        c.practice_played !== undefined ? p.practiceRounds >= c.practice_played : false;
      if (reached) {
        p.unlocked[achievement.id] = Date.now();
        notify(p, "achievement:" + achievement.id, `${achievement.icon} Logro desbloqueado: ${achievement.name}`);
      }
    }
    const oldLevel = levelInfo(previousXp).current;
    const level = levelInfo(p.xp).current;
    if (level.level > oldLevel.level) notify(p, "level:" + level.level, `⭐ Nivel ${level.level}: ${level.title}`);
  }
  function answer(profile, answer) {
    if (!config) return;
    const p = ensure(profile);
    const previousXp = p.xp;
    const correct = answer.marks.filter(mark => mark === true).length;
    p.xp += correct * 5;
    if (answer.attemptId && ["normal", "flash", "puzzle", "sorpresa", "examen"].includes(answer.mode)) {
      if (p.attempt?.id !== answer.attemptId || p.attempt.mode !== answer.mode) {
        p.attempt = { id: answer.attemptId, mode: answer.mode, answers: 0, correct: 0, streak: 0 };
      }
      p.attempt.answers++;
      if (correct === 3) p.attempt.correct++;
      p.attempt.streak = correct === 3 ? p.attempt.streak + 1 : 0;
      p.bestStreak = Math.max(p.bestStreak, p.attempt.streak);
    }
    if (correct === 3) {
      p.correctVerbs++;
      if (Number.isFinite(answer.elapsedMs) && answer.elapsedMs >= 0) {
        p.fastestMs = p.fastestMs === null ? answer.elapsedMs : Math.min(p.fastestMs, answer.elapsedMs);
      }
    }
    evaluate(p, previousXp);
  }
  function complete(profile, game) {
    if (!config) return;
    const p = ensure(profile);
    const attempt = p.attempt;
    if (attempt?.id !== game.id || attempt.mode !== game.mode || !Number.isInteger(game.expectedAnswers) ||
        game.expectedAnswers <= 0 || attempt.answers !== game.expectedAnswers) return;
    const previousXp = p.xp;
    p.xp += 20;
    if (attempt.correct === attempt.answers) p.perfectGames++;
    p.attempt = null;
    evaluate(p, previousXp);
  }
  function practice(profile, answer) {
    if (!config) return;
    const p = ensure(profile);
    const previousXp = p.xp;
    p.practiceRounds++;
    p.xp += answer.marks.filter(mark => mark === true).length * 5;
    // No altera rachas, rapidez ni partidas perfectas de los modos competitivos.
    evaluate(p, previousXp);
  }
  window.Progression = Object.freeze({ ready, empty, ensure, levelInfo, answer, complete, practice });
})();
