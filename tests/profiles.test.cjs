const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const root = path.resolve(__dirname, "..");

async function boot(saved = new Map()) {
  let sequence = 0;
  const warnings = [];
  const localStorage = {
    getItem: key => saved.has(key) ? saved.get(key) : null,
    setItem: (key, value) => saved.set(key, String(value)),
    removeItem: key => saved.delete(key)
  };
  const window = { crypto: { randomUUID: () => "test-" + Date.now() + "-" + (++sequence) } };
  const context = vm.createContext({ window, localStorage, console: { warn: (...args) => warnings.push(args) }, Date, fetch: async () => ({ ok: true, json: async () => JSON.parse(fs.readFileSync(path.join(root, "data/achievements.json"), "utf8")) }) });
  for (const file of ["game-utils.js", "progression.js", "profile-store.js", "powers.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), context);
  }
  await window.ProfileStore.ready();
  return { store: window.ProfileStore, progression: window.Progression, powers: window.PowerSystem, utils: window.GameUtils, saved, localStorage, warnings };
}

test("nombres persistentes y jugadores independientes", async () => {
  const { store } = await boot();
  const players = store.preparePlayers([{ name: "Ana", avatar: "avatar-azul.png" }, { name: "Luis", avatar: "avatar-rojo.png" }]);
  assert.notEqual(players[0].profileId, players[1].profileId);
  const recovered = store.preparePlayers([{ name: " ANA ", avatar: "avatar-gris.png" }]);
  assert.equal(recovered[0].profileId, players[0].profileId);
  assert.equal(store.listProfiles().length, 2);
  assert.throws(() => store.preparePlayers([{ name: "Ana" }, { name: "ana" }]), /distinto/);
});

test("aciertos, errores, tiempo y récord negativo; no se duplican eventos", async () => {
  const { store } = await boot();
  const [ana, luis] = store.preparePlayers([{ name: "Ana" }, { name: "Luis" }]);
  const verb = { infinitive: "go", meaning: "ir" };
  const answer = { id: "a1", verb, marks: [true, true, false], elapsedMs: 6000 };
  assert.equal(store.recordAnswer(ana.profileId, answer), true);
  assert.equal(store.recordAnswer(ana.profileId, answer), false);
  store.recordAnswer(ana.profileId, { id: "a2", verb, marks: [true, true, true], elapsedMs: 4000 });
  assert.equal(store.completeGame(ana.profileId, { id: "g1", mode: "normal", score: -15 }), true);
  assert.equal(store.completeGame(ana.profileId, { id: "g1", mode: "normal", score: -15 }), false);
  const stats = store.getProfile(ana.profileId).stats;
  assert.equal(stats.answeredVerbs, 2);
  assert.equal(stats.correctForms, 5);
  assert.equal(stats.totalForms, 6);
  assert.equal(stats.totalTimeMs / stats.answeredVerbs, 5000);
  assert.equal(stats.verbs["verb:go"].correct, 1);
  assert.equal(stats.verbs["verb:go"].wrong, 1);
  assert.equal(stats.bestScore, -15);
  assert.equal(stats.gamesPlayed, 1);
  assert.equal(store.getProfile(luis.profileId).stats.answeredVerbs, 0);
});

test("examen separado, persistencia al reabrir y reinicio solo del perfil elegido", async () => {
  const initial = await boot();
  initial.localStorage.setItem("unrelated", "conservar");
  const [ana, luis] = initial.store.preparePlayers([{ name: "Ana" }, { name: "Luis" }]);
  initial.store.completeGame(ana.profileId, { id: "normal", mode: "normal", score: 90 });
  initial.store.completeGame(ana.profileId, { id: "exam", mode: "examen", score: 10 });
  initial.store.completeGame(luis.profileId, { id: "flash", mode: "flash", score: 30 });
  const reopened = await boot(initial.saved);
  const stats = reopened.store.getProfile(ana.profileId).stats;
  assert.equal(stats.gamesPlayed, 2);
  assert.equal(stats.bestScore, 90);
  assert.equal(stats.bestExamScore, 10);
  assert.equal(stats.modeCounts.examen, 1);
  reopened.store.resetStats(ana.profileId);
  assert.equal(reopened.store.getProfile(ana.profileId).stats.gamesPlayed, 0);
  assert.equal(reopened.store.getProfile(luis.profileId).stats.gamesPlayed, 1);
  assert.equal(reopened.localStorage.getItem("unrelated"), "conservar");
  assert.equal(reopened.store.completeGame(ana.profileId, { id: "exam", mode: "examen", score: 10 }), false);
});

test("JSON corrupto y utilidades compartidas", async () => {
  const { utils, store, localStorage, warnings } = await boot();
  localStorage.setItem("verbBattleProfiles.v1", "JSON roto");
  assert.equal(store.listProfiles().length, 0);
  assert.equal(warnings.length, 1);
  assert.equal(utils.formatDuration(65000), "1:05");
  assert.equal(utils.formatDuration(0), "—");
  assert.equal(utils.getVerbForms({ past_participle: "gone" })[2], "gone");
  assert.equal(utils.normalizeText(" FÁCIL "), "facil");
});

test("omitir o abandonar guarda respuestas, no una partida completa", async () => {
  const { store } = await boot();
  const [player] = store.preparePlayers([{ name: "Prueba" }]);
  store.recordAnswer(player.profileId, { id: "skip", verb: { infinitive: "add" }, marks: [false, false, false], elapsedMs: 2000 });
  let stats = store.getProfile(player.profileId).stats;
  assert.equal(stats.answeredVerbs, 1);
  assert.equal(stats.gamesPlayed, 0);
  assert.equal(stats.correctForms, 0);
  assert.equal(stats.bestExamScore, null);
  store.completeGame(player.profileId, { id: "first", mode: "flash", score: 90 });
  store.completeGame(player.profileId, { id: "second", mode: "flash", score: 30 });
  stats = store.getProfile(player.profileId).stats;
  assert.equal(stats.bestScore, 90);
  assert.equal(stats.modeCounts.flash, 2);
  assert.equal(store.completeGame(player.profileId, { id: "bad", mode: "unknown", score: 1000 }), false);
});

test("todas las páginas activas cargan scripts existentes sin JS incrustado", async () => {
  for (const name of fs.readdirSync(root).filter(name => name.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(root, name), "utf8");
    assert.equal(/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), false, name);
    for (const match of html.matchAll(/(?:href|src)="([^"#?]+)(?:\?[^"#]*)?"/g)) {
      if (/^(https?:|data:|mailto:)/.test(match[1])) continue;
      assert.ok(fs.existsSync(path.resolve(root, match[1])), name + ": " + match[1]);
    }
  }
});

function send(store, player, attempt, index, marks = [true, true, true], elapsedMs = 4000, mode = "normal") {
  return store.recordAnswer(player.profileId, { id: attempt + ":" + index, attemptId: attempt,
    mode, verb: { infinitive: "go", meaning: "ir" }, marks, elapsedMs });
}

test("XP por forma, primera victoria, rapidez estricta y eventos idempotentes", async () => {
  const { store } = await boot();
  const [player] = store.preparePlayers([{ name: "Ana" }]);
  send(store, player, "a", 0, [true, true, false], 100);
  assert.equal(store.getProfile(player.profileId).progression.xp, 10);
  assert.equal(Object.keys(store.getProfile(player.profileId).progression.unlocked).length, 0);
  send(store, player, "a", 1, undefined, 3000);
  let p = store.getProfile(player.profileId).progression;
  assert.ok(p.unlocked["first-correct"]);
  assert.equal(p.unlocked["fast-finger"], undefined);
  send(store, player, "a", 2, undefined, 2999);
  assert.equal(send(store, player, "a", 2, undefined, 2999), false);
  p = store.getProfile(player.profileId).progression;
  assert.equal(p.xp, 40);
  assert.ok(p.unlocked["fast-finger"]);
  assert.equal(p.notifications.length, 2);
});

test("racha individual se rompe por error, omisión o nuevo intento", async () => {
  const { store } = await boot();
  const [a, b] = store.preparePlayers([{ name: "A" }, { name: "B" }]);
  for (let i = 0; i < 4; i++) send(store, a, "one", i);
  send(store, b, "one", 0, [false, false, false]);
  send(store, a, "one", 4);
  assert.ok(store.getProfile(a.profileId).progression.unlocked["streak-5"]);
  for (let i = 0; i < 4; i++) send(store, b, "two", i);
  send(store, b, "two", 4, [true, false, true]);
  for (let i = 5; i < 9; i++) send(store, b, "two", i);
  send(store, b, "three", 0);
  assert.equal(store.getProfile(b.profileId).progression.unlocked["streak-5"], undefined);
  send(store, b, "three", 1, [false, false, false]);
  assert.equal(store.getProfile(b.profileId).progression.attempt.streak, 0);
});

test("partida perfecta y bono solo al completar todos los verbos en los tres modos", async () => {
  for (const mode of ["normal", "flash", "examen"]) {
    const { store } = await boot();
    const [a, b] = store.preparePlayers([{ name: "A" }, { name: "B" }]);
    send(store, a, "perfect", 0, undefined, 4000, mode);
    assert.equal(store.getProfile(a.profileId).progression.unlocked["no-mistakes"], undefined);
    const game = { id: "perfect", mode, score: 10, expectedAnswers: 1 };
    store.completeGame(a.profileId, game);
    store.completeGame(a.profileId, game);
    const p = store.getProfile(a.profileId).progression;
    assert.equal(p.xp, 35);
    assert.ok(p.unlocked["no-mistakes"]);
    send(store, b, "skip", 0, [false, false, false], 0, mode);
    store.completeGame(b.profileId, { id: "skip", mode, score: 0, expectedAnswers: 1 });
    assert.equal(store.getProfile(b.profileId).progression.xp, 20);
    assert.equal(store.getProfile(b.profileId).progression.unlocked["no-mistakes"], undefined);
    send(store, b, "partial", 0, undefined, 4000, mode);
    store.completeGame(b.profileId, { id: "partial", mode, score: 10, expectedAnswers: 2 });
    assert.equal(store.getProfile(b.profileId).progression.xp, 35);
    assert.equal(store.getProfile(b.profileId).progression.unlocked["no-mistakes"], undefined);
  }
});

test("umbrales de nivel exactos y nivel máximo sin desbordamiento", async () => {
  const { progression, store } = await boot();
  const thresholds = [0, 100, 250, 500, 1000];
  thresholds.forEach((xp, index) => {
    assert.equal(progression.levelInfo(xp).current.level, index + 1);
    if (index) assert.equal(progression.levelInfo(xp - 1).current.level, index);
  });
  assert.equal(progression.levelInfo(5000).next, null);
  assert.equal(progression.levelInfo(5000).percent, 100);
  const [player] = store.preparePlayers([{ name: "Level" }]);
  for (let i = 0; i < 7; i++) send(store, player, "level", i);
  const p = store.getProfile(player.profileId).progression;
  assert.equal(p.xp, 105);
  assert.equal(p.notifications.filter(n => n.id === "level:2").length, 1);
  assert.equal(p.unlocked["practice-10"], undefined);
});

test("migración conserva estadísticas; avisos persisten y se descartan una sola vez", async () => {
  const initial = await boot();
  const [a, b] = initial.store.preparePlayers([{ name: "A" }, { name: "B" }]);
  send(initial.store, a, "old", 0);
  const data = JSON.parse(initial.localStorage.getItem("verbBattleProfiles.v1"));
  delete data.profiles[0].progression;
  initial.localStorage.setItem("verbBattleProfiles.v1", JSON.stringify(data));
  const migrated = await boot(initial.saved);
  assert.equal(migrated.store.getProfile(a.profileId).stats.correctForms, 3);
  assert.equal(migrated.store.getProfile(a.profileId).progression.xp, 0);
  send(migrated.store, a, "new", 0);
  send(migrated.store, b, "other", 0);
  const reopened = await boot(initial.saved);
  assert.equal(reopened.store.getProfile(a.profileId).progression.notifications.length, 1);
  reopened.store.dismissNotification(a.profileId, "achievement:first-correct");
  send(reopened.store, a, "new", 1);
  assert.equal(reopened.store.getProfile(a.profileId).progression.notifications.length, 0);
  reopened.store.resetStats(a.profileId);
  assert.equal(reopened.store.getProfile(a.profileId).progression.xp, 0);
  assert.equal(Object.keys(reopened.store.getProfile(a.profileId).progression.unlocked).length, 0);
  assert.equal(send(reopened.store, a, "new", 0), false);
  assert.equal(reopened.store.getProfile(b.profileId).progression.xp, 15);
  assert.equal(reopened.store.getProfile(b.profileId).progression.notifications.length, 1);
});

test("repaso por perfil: fallar añade, acertar resuelve y conserva historial", async () => {
  const { store } = await boot();
  const [a, b] = store.preparePlayers([{ name: "A" }, { name: "B" }]);
  send(store, a, "game", 0, [true, false, false]);
  assert.equal(Object.keys(store.getProfile(a.profileId).review.pending).length, 1);
  assert.equal(Object.keys(store.getProfile(b.profileId).review.pending).length, 0);
  const answer = { id: "practice-1", verb: { infinitive: "go", past: "went", pastParticiple: "gone" }, marks: [true, true, true] };
  assert.equal(store.recordPractice(a.profileId, { ...answer, assisted: true }), false);
  assert.equal(Object.keys(store.getProfile(a.profileId).review.pending).length, 1);
  assert.equal(store.recordPractice(a.profileId, answer), true);
  assert.equal(store.recordPractice(a.profileId, answer), false);
  const profile = store.getProfile(a.profileId);
  assert.equal(Object.keys(profile.review.pending).length, 0);
  assert.equal(profile.stats.verbs["verb:go"].wrong, 1);
  assert.equal(profile.stats.answeredVerbs, 1);
  assert.equal(profile.stats.gamesPlayed, 0);
  assert.equal(profile.review.rounds, 1);
  assert.equal(profile.progression.xp, 20);
  send(store, a, "game", 1, [false, false, false]);
  assert.equal(Object.keys(store.getProfile(a.profileId).review.pending).length, 1);
  send(store, a, "game", 2);
  assert.equal(Object.keys(store.getProfile(a.profileId).review.pending).length, 0);
});

test("Estudioso: diez rondas reales, sin logros competitivos ni bono de partida", async () => {
  const { store } = await boot();
  const [a] = store.preparePlayers([{ name: "A" }]);
  const answer = { verb: { infinitive: "add" }, marks: [true, true, true] };
  for (let i = 0; i < 9; i++) store.recordPractice(a.profileId, { ...answer, id: "practice:" + i });
  assert.equal(store.getProfile(a.profileId).progression.unlocked["practice-10"], undefined);
  store.recordPractice(a.profileId, { ...answer, id: "practice:9" });
  store.recordPractice(a.profileId, { ...answer, id: "practice:9" });
  let profile = store.getProfile(a.profileId);
  assert.equal(profile.progression.practiceRounds, 10);
  assert.equal(profile.progression.xp, 150);
  assert.ok(profile.progression.unlocked["practice-10"]);
  for (const id of ["first-correct", "streak-5", "fast-finger", "no-mistakes"]) assert.equal(profile.progression.unlocked[id], undefined);
  assert.equal(profile.stats.gamesPlayed, 0);
  assert.equal(profile.stats.totalForms, 0);
  store.resetStats(a.profileId);
  profile = store.getProfile(a.profileId);
  assert.equal(profile.review.rounds, 0);
  assert.equal(profile.progression.practiceRounds, 0);
  assert.equal(store.recordPractice(a.profileId, { ...answer, id: "practice:9" }), false);
});

test("migración del repaso usa solo errores atribuibles y no revive pendientes resueltos", async () => {
  const { store, localStorage, saved } = await boot();
  const [a] = store.preparePlayers([{ name: "A" }]);
  send(store, a, "old", 0, [false, false, false]);
  const old = JSON.parse(localStorage.getItem("verbBattleProfiles.v1"));
  delete old.profiles[0].review;
  delete old.profiles[0].progression.practiceRounds;
  localStorage.setItem("verbBattleProfiles.v1", JSON.stringify(old));
  localStorage.setItem("failedVerbs", JSON.stringify([{ infinitive: "unassigned" }]));
  const migrated = await boot(saved);
  assert.equal(Object.keys(migrated.store.getProfile(a.profileId).review.pending).length, 1);
  assert.equal(migrated.store.getProfile(a.profileId).progression.practiceRounds, 0);
  migrated.store.recordPractice(a.profileId, { id: "review", verb: { infinitive: "go" }, marks: [true, true, true] });
  const reopened = await boot(saved);
  assert.equal(Object.keys(reopened.store.getProfile(a.profileId).review.pending).length, 0);
  assert.equal(reopened.store.getProfile(a.profileId).stats.verbs["verb:go"].wrong, 1);
});

test("poderes Flash: racha, uso único, multiplicador y orden invertido", async () => {
  const { powers } = await boot();
  const game = powers.create(() => 0);
  assert.equal(game.record("ana", true), null);
  assert.equal(game.record("ana", true), null);
  assert.equal(game.record("ana", true), "double");
  assert.equal(game.pending("ana"), "double");
  assert.equal(game.record("ana", true), null);
  assert.equal(game.activate("ana"), "double");
  assert.equal(game.takeMultiplier("ana"), 2);
  assert.equal(game.takeMultiplier("ana"), 1);
  assert.equal(game.activate("ana"), null);
  game.record("luis", true); game.record("luis", false);
  assert.equal(game.pending("luis"), null);
  const hint = powers.create(() => .4);
  hint.record("ana", true); hint.record("ana", true); hint.record("ana", true);
  assert.equal(hint.pending("ana"), "hint");
  assert.equal(hint.activate("ana"), "hint");
  const reverse = powers.create(() => .9);
  reverse.record("ana", true); reverse.record("ana", true); reverse.record("ana", true);
  assert.equal(reverse.activate("ana"), "reverse");
});

test("Puzzle usa estadísticas competitivas y se migra sin perder otros modos", async () => {
  const { store } = await boot();
  const [player] = store.preparePlayers([{ name: "Puzzle" }]);
  assert.equal(store.recordAnswer(player.profileId, { id: "puzzle:0", attemptId: "puzzle", mode: "puzzle",
    verb: { infinitive: "put" }, marks: [true, true, true], elapsedMs: 0 }), true);
  assert.equal(store.completeGame(player.profileId, { id: "puzzle", mode: "puzzle", score: 30, expectedAnswers: 1 }), true);
  const profile = store.getProfile(player.profileId);
  assert.equal(profile.stats.modeCounts.puzzle, 1);
  assert.equal(profile.stats.bestScore, 30);
  assert.equal(profile.progression.xp, 35);
});

test("Sorpresa guarda resultados competitivos en su contador independiente", async () => {
  const { store } = await boot();
  const [player] = store.preparePlayers([{ name: "Sorpresa" }]);
  store.recordAnswer(player.profileId, { id: "surprise:0", attemptId: "surprise", mode: "sorpresa", verb: { infinitive: "go" }, marks: [true, false, true], elapsedMs: 1200 });
  assert.equal(store.completeGame(player.profileId, { id: "surprise", mode: "sorpresa", score: 15, expectedAnswers: 1 }), true);
  const stats = store.getProfile(player.profileId).stats;
  assert.equal(stats.modeCounts.sorpresa, 1);
  assert.equal(stats.bestScore, 15);
  assert.equal(stats.correctForms, 2);
});
