import React, { useState, useEffect } from "react";

// ---- Persistance robuste (window.storage si dispo, sinon localStorage, sinon mémoire) ----
// Certaines surfaces mobiles n'exposent pas window.storage : on détecte et on bascule.
const mem = {}; // secours mémoire (au moins la session courante fonctionne)
const backend = { mode: "detecting" }; // "cloud" | "local" | "memory"

const hasWindowStorage = typeof window !== "undefined" && window.storage && typeof window.storage.get === "function";
const hasLocalStorage = (() => {
  try { const k = "__t"; window.localStorage.setItem(k, "1"); window.localStorage.removeItem(k); return true; }
  catch { return false; }
})();

const store = {
  async get(key) {
    // a. window.storage
    if (hasWindowStorage) {
      try { const r = await window.storage.get(key); backend.mode = "cloud"; return r ? JSON.parse(r.value) : null; }
      catch (e) { /* on retombe plus bas */ }
    }
    // b. localStorage
    if (hasLocalStorage) {
      try { const v = window.localStorage.getItem("golf:" + key); if (backend.mode === "detecting" || backend.mode === "memory") backend.mode = "local"; return v ? JSON.parse(v) : null; }
      catch (e) {}
    }
    // c. mémoire
    backend.mode = backend.mode === "detecting" ? "memory" : backend.mode;
    return key in mem ? mem[key] : null;
  },
  async set(key, value) {
    const json = JSON.stringify(value);
    let ok = false;
    if (hasWindowStorage) {
      try { await window.storage.set(key, json); backend.mode = "cloud"; ok = true; } catch (e) {}
    }
    if (!ok && hasLocalStorage) {
      try { window.localStorage.setItem("golf:" + key, json); if (backend.mode !== "cloud") backend.mode = "local"; ok = true; } catch (e) {}
    }
    // toujours écrire en mémoire comme filet
    mem[key] = value;
    if (!ok && backend.mode === "detecting") backend.mode = "memory";
    return ok;
  },
  async del(key) {
    if (hasWindowStorage) { try { await window.storage.delete(key); } catch (e) {} }
    if (hasLocalStorage) { try { window.localStorage.removeItem("golf:" + key); } catch (e) {} }
    delete mem[key];
  },
};

// Compteur de révision des données (pour proposer un backup quand il y a du nouveau)
async function bumpDataRev() {
  const cur = (await store.get("data:rev")) || 0;
  await store.set("data:rev", cur + 1);
  return cur + 1;
}


// ---- Parcours par défaut (par + index de difficulté SI de chaque trou) ----
const defaultCourse = () => ({
  name: "Parcours",
  par: 72,
  holes: Array.from({ length: 18 }, (_, i) => ({
    par: [4,4,3,5,4,4,3,5,4,4,3,5,4,4,3,5,4,4][i],
    si: i + 1,
  })),
  // tees: { départ: { M:{slope,sss}, D:{slope,sss} } } ; null = pas de valeur officielle
  tees: {
    Noir: { M: null, D: null }, Blanc: { M: null, D: null },
    Jaune: { M: null, D: null }, Bleu: { M: null, D: null }, Rouge: { M: null, D: null },
  },
});

// ---- Parcours réels pré-enregistrés ----
const presetCourses = () => ([
  {
    name: "Les étangs — Lyon Salvagny",
    par: 72,
    holes: [
      [4,11],[4,13],[5,17],[4,3],[3,15],[5,7],[3,5],[4,1],[4,9],
      [5,18],[4,2],[4,4],[4,10],[3,8],[5,12],[4,14],[3,6],[4,16],
    ].map(([par, si]) => ({ par, si })),
    tees: {
      Noir:  { M: { slope: 138, sss: 72.4 }, D: null },
      Blanc: { M: { slope: 135, sss: 71.8 }, D: null },
      Jaune: { M: { slope: 129, sss: 69.7 }, D: { slope: 133, sss: 75.4 } },
      Bleu:  { M: { slope: 123, sss: 66.9 }, D: { slope: 125, sss: 71.9 } },
      Rouge: { M: { slope: 118, sss: 64.5 }, D: { slope: 122, sss: 68.4 } },
    },
  },
  {
    name: "Le Breuil — Golf du Gouverneur",
    par: 72,
    holes: [
      [4,8],[3,12],[5,18],[3,10],[4,2],[4,6],[4,14],[5,16],[4,4],
      [4,11],[3,17],[4,3],[4,13],[4,1],[5,9],[3,7],[5,15],[4,5],
    ].map(([par, si]) => ({ par, si })),
    tees: {
      Noir:  { M: { slope: 141, sss: 74.0 }, D: null },
      Blanc: { M: { slope: 139, sss: 72.0 }, D: null },
      Jaune: { M: { slope: 133, sss: 70.1 }, D: { slope: 138, sss: 76.2 } },
      Bleu:  { M: { slope: 130, sss: 68.3 }, D: { slope: 133, sss: 74.0 } },
      Rouge: { M: { slope: 124, sss: 65.3 }, D: { slope: 126, sss: 69.7 } },
    },
  },
  {
    name: "Samanah — Marrakech",
    par: 72,
    holes: [
      [4,13],[4,3],[3,5],[4,7],[5,9],[4,15],[4,1],[3,11],[5,17],
      [4,8],[4,16],[5,18],[4,4],[3,14],[4,6],[4,10],[3,12],[4,2],
    ].map(([par, si]) => ({ par, si })),
    tees: {
      Noir:  { M: { slope: 149, sss: 76.0 }, D: null },
      Blanc: { M: { slope: 143, sss: 73.0 }, D: null },
      Jaune: { M: { slope: 138, sss: 72.0 }, D: null },
      Bleu:  { M: { slope: 141, sss: 76.0 }, D: null },
      Rouge: { M: { slope: 134, sss: 73.0 }, D: null },
    },
  },
  {
    name: "Assoufid — Marrakech",
    par: 72,
    holes: [
      [4,4],[5,12],[3,14],[4,6],[4,10],[4,16],[4,2],[4,8],[3,18],
      [4,1],[4,7],[3,13],[5,9],[5,3],[4,5],[4,15],[3,17],[4,11],
    ].map(([par, si]) => ({ par, si })),
    // SSS non fournis sur la carte → laissés vides (avertissement + index brut tant que non saisis)
    tees: {
      Noir:  { M: { slope: 133, sss: null }, D: null },
      Blanc: { M: { slope: 131, sss: null }, D: null },
      Jaune: { M: { slope: 129, sss: null }, D: null },
      Bleu:  { M: { slope: 127, sss: null }, D: { slope: 135, sss: null } },
      Rouge: { M: null, D: { slope: 128, sss: null } },
    },
  },
  amelkisCourse(),
]);

// ---- Amelkis : club à 3 boucles de 9 combinables (Option B) ----
// Chaque boucle = 9 trous [par, hcp]. Les SSS/Slope dépendent de la COMBINAISON.
function amelkisCourse(){
  return {
    name: "Amelkis — Marrakech",
    par: 72,
    isLoops: true,
    loops: {
      Bleu:  [[4,8],[5,1],[3,9],[4,5],[4,2],[4,6],[4,3],[3,7],[5,4]].map(x=>({par:x[0],si:x[1]})),
      Rouge: [[4,8],[4,4],[5,6],[3,7],[4,1],[4,2],[4,9],[5,3],[3,5]].map(x=>({par:x[0],si:x[1]})),
      Vert:  [[4,4],[3,1],[4,5],[4,6],[4,7],[4,9],[3,8],[5,2],[5,3]].map(x=>({par:x[0],si:x[1]})),
    },
    // tees par combinaison "A+B" (A=aller, B=retour). Chiffres homologués de la carte.
    combos: {
      "Bleu+Rouge": { Noir:{M:{slope:135,sss:74.5}}, Blanc:{M:{slope:132,sss:71.9}}, Jaune:{M:{slope:124,sss:70.0},D:{slope:140,sss:75.5}}, Bleu:{M:{slope:119,sss:67.5},D:{slope:133,sss:72.5}}, Rouge:{D:{slope:120,sss:69.6}} },
      "Rouge+Vert": { Noir:{M:{slope:138,sss:74.2}}, Blanc:{M:{slope:128,sss:71.4}}, Jaune:{M:{slope:119,sss:69.6},D:{slope:135,sss:75.2}}, Bleu:{M:{slope:118,sss:69.0},D:{slope:135,sss:74.4}}, Rouge:{D:{slope:117,sss:69.3}} },
      "Bleu+Vert":  { Noir:{M:{slope:137,sss:74.6}}, Blanc:{M:{slope:127,sss:72.1}}, Jaune:{M:{slope:124,sss:70.4},D:{slope:137,sss:76.1}}, Bleu:{M:{slope:120,sss:68.2},D:{slope:131,sss:73.3}}, Rouge:{D:{slope:121,sss:70.1}} },
    },
  };
}

// Assemble un parcours 18 trous jouable à partir d'un club à boucles + choix aller/retour.
function buildLoopCourse(course, front, back){
  var f = course.loops[front] || [], b = course.loops[back] || [];
  var holes = f.concat(b).map(function(h){ return { par:h.par, si:h.si }; });
  // renuméroter les HCP 1..18 en gardant l'ordre de difficulté relatif des deux boucles
  var order = holes.map(function(h,i){ return {i:i, si:h.si, half:i<9?0:1}; });
  order.sort(function(a,b){ return a.si-b.si || a.half-b.half; });
  order.forEach(function(o,rank){ holes[o.i].si = rank+1; });
  // tees : combinaison homologuée si elle existe (dans un sens ou l'autre), sinon vide
  var key1 = front+"+"+back, key2 = back+"+"+front;
  var combos = course.combos || {};
  var tees = combos[key1] || combos[key2] || { Noir:{M:null,D:null},Blanc:{M:null,D:null},Jaune:{M:null,D:null},Bleu:{M:null,D:null},Rouge:{M:null,D:null} };
  return { name: course.name+" ("+front+"+"+back+")", par: holes.reduce(function(s,h){return s+h.par;},0), holes: holes, tees: tees };
}

// Handicap de jeu WHS : index × (slope/113) + (SSS − Par), puis × allowance, arrondi.
// Si pas de slope/SSS (départ sans données, ou valeurs manquantes), retombe sur l'index brut.
function playingHandicap(index, course, tee, sex, allowancePct) {
  const alw = (allowancePct || 100) / 100;
  const par = course.par || (course.holes ? course.holes.reduce((s, h) => s + h.par, 0) : 72);
  const t = course.tees && course.tees[tee] ? course.tees[tee][sex] : null;
  let base;
  if (t && t.slope && t.sss != null) {
    base = index * (t.slope / 113) + (t.sss - par); // Course Handicap WHS
  } else {
    base = index; // fallback sans données de départ
  }
  return Math.round(base * alw);
}

// Répartition des coups rendus sur un trou selon le HCP (index de difficulté) du trou et le handicap de jeu
function strokesOnHole(playingHcp, si, nbHoles) {
  if (playingHcp <= 0) return 0;
  let s = 0;
  if (si <= playingHcp) s += 1;
  if (si <= playingHcp - nbHoles) s += 1;
  if (si <= playingHcp - 2 * nbHoles) s += 1;
  return s;
}

// Points Stableford : par net = 2 points
function stablefordPoints(gross, par, received) {
  if (gross == null || gross === "") return null;
  const net = gross - received;
  const diff = par - net;
  return Math.max(0, 2 + diff);
}

// Chouette : 3 joueurs en brut, 6 points distribués par trou selon les scores.
// Retourne un tableau de points aligné sur l'ordre des scores fournis.
function chouettePoints(scores) {
  // scores : [s0, s1, s2] (bruts). Renvoie [p0, p1, p2].
  if (scores.some(s => s === "" || s == null)) return [null, null, null];
  const [a, b, c] = scores;
  const min = Math.min(a, b, c);
  const nbWinners = scores.filter(s => s === min).length;
  if (nbWinners === 3) return [2, 2, 2];               // égalité générale
  if (nbWinners === 2) {                                 // double égalité pour le gain
    return scores.map(s => (s === min ? 3 : 0));
  }
  // un seul gagnant (4 pts)
  const rest = scores.filter(s => s !== min);
  const secondMin = Math.min(...rest);
  const nbSecond = rest.filter(s => s === secondMin).length;
  if (nbSecond === 2) {                                  // égalité pour la 2e place
    return scores.map(s => (s === min ? 4 : 1));
  }
  // trois scores différents : 4 / 2 / 0
  const third = Math.max(a, b, c);
  return scores.map(s => (s === min ? 4 : s === third ? 0 : 2));
}

const C = {
  green: "#2f5e3f", greenDark: "#264d33", greenLight: "#e2ebe2", accent: "#2f5e3f",
  cream: "#f3f3f1", border: "#dcdcd6", text: "#1c1c1a", sub: "#6b6f6b", gold: "#a8551f",
  ink: "#1c1c1a", line: "#e2e2dd", rust: "#a8551f",
};
const SERIF = 'Georgia, "Times New Roman", "Playfair Display", serif';
// Couleurs de pastille joueur (initiale sur rond coloré), façon Card & Pencil
const PLAYER_COLORS = ["#3d6b4a", "#b5622f", "#2f4a7a", "#6b4a8a", "#4a7a5a", "#8a6b2f", "#7a2f4a", "#2f6b6b"];
function playerColor(i) { return PLAYER_COLORS[i % PLAYER_COLORS.length]; }
function Avatar({ name, i, size = 40 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return <span style={{ width: size, height: size, borderRadius: "50%", background: playerColor(i), color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>{initial}</span>;
}

// Marqueur de score façon PGA : cercle = sous le par, carré = au-dessus.
function ScoreMark({ value, par, size = 34 }) {
  if (value === "" || value == null) return <span style={{ fontSize: 15, color: C.sub }}>·</span>;
  const diff = value - par;
  const num = <span style={{ fontSize: 15, fontWeight: 600, color: C.ink, lineHeight: 1 }}>{value}</span>;
  if (diff === 0) return <span style={{ display: "inline-flex", width: size, height: size, alignItems: "center", justifyContent: "center" }}>{num}</span>;
  const shape = diff < 0 ? "50%" : "6px";
  const doubled = Math.abs(diff) >= 2;
  const color = C.ink;
  const outer = { display: "inline-flex", width: size, height: size, alignItems: "center", justifyContent: "center", borderRadius: shape, border: `1.5px solid ${color}`, boxShadow: doubled ? `0 0 0 2.5px #fff, 0 0 0 4px ${color}` : "none", boxSizing: "border-box" };
  return <span style={outer}>{num}</span>;
}

// Départs (indicatif, sans effet sur le calcul). bg/txt = pastille de couleur
const TEES = [
  { name: "Noir", bg: "#111", txt: "#fff" },
  { name: "Blanc", bg: "#fff", txt: "#333" },
  { name: "Jaune", bg: "#f2d600", txt: "#333" },
  { name: "Bleu", bg: "#2b5fd6", txt: "#fff" },
  { name: "Rouge", bg: "#c8102e", txt: "#fff" },
];
const teeStyle = (name) => TEES.find(t => t.name === name) || { bg: "#ddd", txt: "#333" };

export default function App() {
  const [screen, setScreen] = useState("home");
  const [rounds, setRounds] = useState([]);
  const [current, setCurrent] = useState(null);
  const [savedCourses, setSavedCourses] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [storeMode, setStoreMode] = useState("detecting");
  const [backupNeeded, setBackupNeeded] = useState(false);

  async function loadAll() {
    // Etape 1 - Charger et compléter les parcours d'abord (ils portent les Slope/SSS)
    const stored = (await store.get("courses")) || [];
    const presets = presetCourses();
    let cChanged = false;
    const merged = [...stored];
    presets.forEach(pc => {
      const idxc = merged.findIndex(c => c.name === pc.name);
      if (idxc === -1) { merged.push(pc); cChanged = true; }
      else if (!merged[idxc].tees) {
        merged[idxc] = { ...merged[idxc], par: pc.par, tees: pc.tees }; cChanged = true;
      }
    });
    setSavedCourses(merged);
    if (cChanged) await store.set("courses", merged);

    // Etape 2 - Charger les parties et recalculer le handicap de jeu (WHS) contre le parcours
    const idx = (await store.get("rounds:index")) || [];
    const rs = [];
    for (const id of idx) {
      let r = await store.get("round:" + id);
      if (!r) continue;
      // Utilise les Slope/SSS figés sur la partie (combinaisons de boucles), sinon le parcours trouvé par nom
      const course = (r.tees) ? { name: r.courseName, par: r.par, holes: r.holes, tees: r.tees } : merged.find(c => c.name === r.courseName);
      if (course && course.tees) {
        const par = r.par || course.par || (course.holes ? course.holes.reduce((s, h) => s + h.par, 0) : 72);
        let rChanged = false;
        const players = r.players.map(p => {
          const sex = p.sex || "M";
          let playing;
          if (course.tees[p.tee] && course.tees[p.tee][sex] && course.tees[p.tee][sex].slope) {
            playing = playingHandicap(p.hcp, { ...course, par }, p.tee, sex, r.allowance || 100);
          } else {
            playing = Math.round((p.hcp || 0) * ((r.allowance || 100) / 100));
          }
          if (playing !== p.playing || !p.sex) rChanged = true;
          return { ...p, sex, playing };
        });
        if (rChanged) { r = { ...r, par, players }; await store.set("round:" + id, r); }
      }
      rs.push(r);
    }
    rs.sort((a, b) => b.createdAt - a.createdAt);
    setRounds(rs);

    setRoster((await store.get("players:roster")) || []);
    // Test d'écriture réel pour connaître le mode de stockage effectif
    await store.set("__probe", Date.now());
    setStoreMode(backend.mode);
    await refreshBackupFlag();
    setLoaded(true);
  }
  async function reloadAll() { await loadAll(); }

  async function refreshBackupFlag() {
    const rev = (await store.get("data:rev")) || 0;
    const last = (await store.get("data:lastBackupRev")) || 0;
    setBackupNeeded(rev > last);
  }
  async function markBackupDone() {
    const rev = (await store.get("data:rev")) || 0;
    await store.set("data:lastBackupRev", rev);
    setBackupNeeded(false);
  }

  useEffect(() => { loadAll(); }, []);

  async function persistRound(round) {
    await store.set("round:" + round.id, round);
    const idx = (await store.get("rounds:index")) || [];
    if (!idx.includes(round.id)) { idx.push(round.id); await store.set("rounds:index", idx); }
    setRounds([...rounds.filter(r => r.id !== round.id), round].sort((a,b)=>b.createdAt-a.createdAt));
    await bumpDataRev(); await refreshBackupFlag();
  }
  async function deleteRound(id) {
    await store.del("round:" + id);
    const idx = ((await store.get("rounds:index")) || []).filter(x => x !== id);
    await store.set("rounds:index", idx);
    setRounds(rounds.filter(r => r.id !== id));
    await bumpDataRev(); await refreshBackupFlag();
  }
  async function saveCourses(list) { setSavedCourses(list); await store.set("courses", list); await bumpDataRev(); await refreshBackupFlag(); }
  async function saveRoster(list) { setRoster(list); await store.set("players:roster", list); await bumpDataRev(); await refreshBackupFlag(); }

  const tab = (screen === "home" || screen === "setup" || screen === "results" || screen === "play") ? "home"
    : screen === "courses" ? "courses" : screen === "players" ? "players" : screen === "data" ? "settings" : "home";
  const showTabs = screen !== "play"; // pas d'onglets pendant la saisie (barre de trous à la place)

  return (
    <div style={{ fontFamily: "-apple-system, system-ui, sans-serif", background: C.cream, minHeight: "100vh", color: C.text, maxWidth: 480, margin: "0 auto", paddingTop: "env(safe-area-inset-top)" }}>
      {loaded && storeMode === "memory" && (
        <div style={{ fontSize: 11, background: "#fdecec", color: C.rust, padding: "8px 16px", lineHeight: 1.3 }}>
          Stockage persistant indisponible : pensez à exporter vos données régulièrement.
        </div>
      )}
      <main style={{ padding: 16, paddingBottom: showTabs ? 90 : 40 }}>
        {!loaded && <p style={{ color: C.sub }}>Chargement…</p>}
        {loaded && screen === "home" && <Home rounds={rounds} onNew={() => setScreen("setup")} onOpen={(r) => { setCurrent(r); setScreen(r.finished ? "results" : "play"); }} onDelete={deleteRound} onData={() => setScreen("data")} backupNeeded={backupNeeded} onBackupDone={markBackupDone} />}
        {loaded && screen === "setup" && <Setup savedCourses={savedCourses} roster={roster} onSaveRoster={saveRoster} onCancel={() => setScreen("home")} onStart={(r) => { setCurrent(r); persistRound(r); setScreen("play"); }} />}
        {loaded && screen === "play" && current && <Play round={current} onUpdate={(r) => { setCurrent(r); persistRound(r); }} onFinish={(r) => { const f = { ...r, finished: true }; setCurrent(f); persistRound(f); setScreen("results"); }} onBack={() => setScreen("home")} />}
        {loaded && screen === "results" && current && <Results round={current} onBack={() => setScreen("home")} onEdit={() => setScreen("play")} backupNeeded={backupNeeded} onBackupDone={markBackupDone} />}
        {loaded && screen === "courses" && <Courses courses={savedCourses} onSave={saveCourses} onBack={() => setScreen("home")} />}
        {loaded && screen === "players" && <Players roster={roster} onSave={saveRoster} onBack={() => setScreen("home")} />}
        {loaded && screen === "data" && <DataScreen onReload={reloadAll} onBack={() => setScreen("home")} />}
      </main>
      {loaded && showTabs && <TabBar active={tab} onNav={(t) => setScreen(t === "settings" ? "data" : t)} />}
    </div>
  );
}

function TabBar({ active, onNav }) {
  const items = [
    ["home", "Accueil", "⌂"],
    ["courses", "Parcours", "⛳"],
    ["players", "Joueurs", "◐"],
    ["settings", "Réglages", "⚙"],
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, background: "#fff", borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", padding: "8px 0 calc(6px + env(safe-area-inset-bottom))" }}>
        {items.map(([key, label, icon]) => {
          const on = active === key;
          return (
            <button key={key} onClick={() => onNav(key)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? C.green : C.sub }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: on ? 700 : 500 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Home({ rounds, onNew, onOpen, onDelete, onData, backupNeeded, onBackupDone }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, color: C.sub }}>{greeting}</div>
          <div style={{ fontFamily: SERIF, fontSize: 34, fontWeight: 700, letterSpacing: -.5, lineHeight: 1.05 }}>Golf Score</div>
        </div>
        <span style={{ width: 38, height: 38, borderRadius: "50%", background: C.green, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>⛳</span>
      </div>

      {backupNeeded && <div style={{ marginBottom: 14 }}><BackupBanner onCopied={onBackupDone} /></div>}

      <div style={{ background: C.green, color: "#fff", borderRadius: 20, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 22, marginBottom: 10 }}>⚑</div>
        <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700, marginBottom: 6 }}>Nouvelle partie</div>
        <div style={{ fontSize: 14, opacity: .9, marginBottom: 16, lineHeight: 1.4 }}>Choisissez un parcours, ajoutez vos joueurs, scorez trou par trou.</div>
        <button onClick={onNew} style={{ background: "#fff", color: C.green, border: "none", borderRadius: 24, padding: "12px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Démarrer →</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700 }}>Parties récentes</div>
      </div>
      {rounds.length === 0 && <p style={{ color: C.sub, fontSize: 14 }}>Aucune partie pour l'instant.</p>}
      {rounds.map((r) => {
        const nb = r.holes ? r.holes.length : 18;
        let winner = null;
        try {
          const f = roundFormats(r)[0];
          const cf = computeFormat(r, f);
          winner = cf.sorted[0];
        } catch (e) {}
        return (
          <div key={r.id} style={{ background: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
            <div onClick={() => onOpen(r)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, cursor: "pointer" }}>
              <span style={{ width: 46, height: 46, borderRadius: 12, background: C.greenLight, color: C.green, display: "inline-flex", alignItems: "center", justifyContent: "center", fontFamily: SERIF, fontWeight: 700, fontSize: 18, flexShrink: 0 }}>{nb}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.courseName}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{new Date(r.createdAt).toLocaleDateString("fr-FR")} · {r.players.length} joueur(s){r.finished ? "" : " · en cours"}</div>
                {winner && r.finished && <div style={{ fontSize: 12, color: C.rust, fontWeight: 700, marginTop: 2 }}>Gagnant : {winner.name}</div>}
              </div>
            </div>
            <button onClick={() => onDelete(r.id)} style={{ background: "none", border: "none", color: C.sub, fontSize: 16, cursor: "pointer" }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}

function Setup({ onStart, onCancel, savedCourses, roster, onSaveRoster }) {
  const [formats, setFormats] = useState(["stableford"]);
  const [course, setCourse] = useState(savedCourses[0] || defaultCourse());
  const [frontLoop, setFrontLoop] = useState("");
  const [backLoop, setBackLoop] = useState("");
  const [players, setPlayers] = useState([{ name: "Joueur 1", hcp: "18", tee: "Jaune", sex: "M", mSlope: "", mSss: "" }]);
  const [allowance, setAllowance] = useState("100");
  const [expandedRow, setExpandedRow] = useState(-1);

  // Parcours effectif : si club à boucles, on assemble aller+retour
  const loopNames = course.isLoops ? Object.keys(course.loops) : [];
  const front = frontLoop || (loopNames[0] || "");
  const back = backLoop || (loopNames[1] || loopNames[0] || "");
  const effCourse = course.isLoops ? buildLoopCourse(course, front, back) : course;

  function toggleFormat(f) {
    setFormats(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }
  function addPlayer() { if (players.length >= 8) return; setPlayers([...players, { name: "Joueur " + (players.length + 1), hcp: "18", tee: "Jaune", sex: "M", mSlope: "", mSss: "" }]); }
  function update(i, k, v) { const p = [...players]; p[i] = { ...p[i], [k]: v }; setPlayers(p); }
  function remove(i) { setPlayers(players.filter((_, j) => j !== i)); }
  function pickFromRoster(i, name) {
    const rp = (roster || []).find(x => x.name === name);
    if (!rp) return;
    const p = [...players]; p[i] = { ...p[i], name: rp.name, hcp: String(rp.hcp), tee: rp.tee || p[i].tee, sex: rp.sex || p[i].sex || "M" }; setPlayers(p);
  }
  function saveToRoster(i) {
    const p = players[i];
    if (!p.name.trim()) { alert("Donnez un nom au joueur avant de l'enregistrer."); return; }
    const entry = { name: p.name.trim(), hcp: parseFloat(p.hcp) || 0, tee: p.tee || "Jaune", sex: p.sex || "M" };
    const list = [...(roster || []).filter(x => x.name !== entry.name), entry].sort((a, b) => a.name.localeCompare(b.name));
    onSaveRoster(list);
  }
  // Un départ a-t-il des données pour ce sexe ? (sur le parcours effectif)
  function teeHasData(tee, sex) {
    const t = effCourse.tees && effCourse.tees[tee] ? effCourse.tees[tee][sex] : null;
    return !!(t && t.slope && t.sss != null);
  }

  function start() {
    if (formats.length === 0) { alert("Sélectionnez au moins une formule."); return; }
    if ((formats.includes("chouette_brut") || formats.includes("chouette_net")) && players.length !== 3) {
      alert("La Chouette se joue à exactement 3 joueurs.");
      return;
    }
    if (formats.includes("matchplay") && players.length !== 2) {
      alert("Le Match Play se joue à exactement 2 joueurs.");
      return;
    }
    const alwPct = parseFloat(allowance) || 100;
    const nbHoles = effCourse.holes.length;
    const round = {
      id: "r" + Date.now(), createdAt: Date.now(), courseName: effCourse.name,
      formats, format: formats[0],
      allowance: alwPct,
      par: effCourse.par || effCourse.holes.reduce((s, h) => s + h.par, 0),
      holes: effCourse.holes.map(h => ({ ...h })),
      tees: effCourse.tees, // fige les Slope/SSS de la combinaison pour le recalcul ultérieur
      players: players.map((p, idx) => {
        const idxHcp = parseFloat(p.hcp) || 0;
        const sex = p.sex || "M";
        let playing;
        if (teeHasData(p.tee, sex)) {
          playing = playingHandicap(idxHcp, effCourse, p.tee, sex, alwPct);
        } else if (p.mSlope && p.mSss) {
          const fake = { par: effCourse.par || effCourse.holes.reduce((s, h) => s + h.par, 0), tees: { [p.tee]: { [sex]: { slope: parseFloat(p.mSlope), sss: parseFloat(p.mSss) } } } };
          playing = playingHandicap(idxHcp, fake, p.tee, sex, alwPct);
        } else {
          playing = Math.round(idxHcp * (alwPct / 100));
        }
        return { id: "p" + idx + Date.now(), name: p.name || ("Joueur " + (idx + 1)), hcp: idxHcp, tee: p.tee || "Jaune", sex, playing, scores: Array(nbHoles).fill("") };
      }),
      finished: false,
    };
    onStart(round);
  }

  const formatPills = [
    ["stableford", "Stableford"],
    ["strokeplay", "Stroke Play"],
    ["matchplay", "Match Play"],
    ["chouette_net", "Chouette"],
    ["stableford_brut", "Stableford brut"],
    ["strokeplay_brut", "Stroke brut"],
    ["chouette_brut", "Chouette brut"],
    ["scramble", "Scramble"],
  ];

  return (
    <div>
      <ScreenHeader title="Nouvelle partie" onBack={onCancel} />

      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Parcours</div>
      <select value={course.name} onChange={e => { const c = savedCourses.find(x => x.name === e.target.value); if (c) { setCourse(c); setFrontLoop(""); setBackLoop(""); } }} style={input()}>
        {(savedCourses.length ? savedCourses : [course]).map((c, i) => <option key={i} value={c.name}>{c.name}</option>)}
      </select>
      {course.isLoops && (
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: C.sub, margin: "0 0 6px" }}>Club à boucles — choisissez l'aller et le retour :</p>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.sub }}>Aller</label>
              <select value={front} onChange={e => setFrontLoop(e.target.value)} style={{ ...input(), marginBottom: 0 }}>
                {loopNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: C.sub }}>Retour</label>
              <select value={back} onChange={e => setBackLoop(e.target.value)} style={{ ...input(), marginBottom: 0 }}>
                {loopNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {(() => {
            const combos = course.combos || {};
            const homologated = combos[front + "+" + back] || combos[back + "+" + front];
            return !homologated ? <p style={{ fontSize: 11, color: C.rust, marginTop: 6 }}>⚠ Combinaison non homologuée : index brut utilisé.</p> : null;
          })()}
        </div>
      )}
      <p style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>Par {effCourse.holes.reduce((s, h) => s + h.par, 0)} · {effCourse.holes.length} trous</p>

      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, margin: "18px 0 8px" }}>Formules</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {formatPills.map(([f, label]) => {
          const on = formats.includes(f);
          return (
            <button key={f} onClick={() => toggleFormat(f)} style={{
              padding: "9px 15px", borderRadius: 22, cursor: "pointer", fontSize: 14, fontWeight: on ? 700 : 500,
              border: on ? "none" : `1px solid ${C.border}`, background: on ? C.green : "#fff", color: on ? "#fff" : C.text }}>
              {label}
            </button>
          );
        })}
      </div>
      {(formats.includes("chouette_net") || formats.includes("chouette_brut")) && <p style={{ fontSize: 11, color: C.rust, marginTop: 8 }}>Chouette : exactement 3 joueurs.</p>}
      {formats.includes("matchplay") && <p style={{ fontSize: 11, color: C.rust, marginTop: 8 }}>Match Play : exactement 2 joueurs.</p>}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 8px" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1 }}>Joueurs</span>
        <span style={{ fontSize: 12, color: C.sub }}>Allowance
          <input type="number" value={allowance} onChange={e => setAllowance(e.target.value)} style={{ width: 52, marginLeft: 6, padding: "4px 6px", border: `1px solid ${C.border}`, borderRadius: 8, textAlign: "center", fontSize: 13 }} />%
        </span>
      </div>

      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
        {players.map((p, i) => {
          const sex = p.sex || "M";
          const hasData = teeHasData(p.tee, sex);
          const idxHcp = parseFloat(p.hcp) || 0;
          const alwPct = parseFloat(allowance) || 100;
          let preview = null;
          if (hasData) preview = playingHandicap(idxHcp, effCourse, p.tee, sex, alwPct);
          else if (p.mSlope && p.mSss) {
            const fake = { par: effCourse.par || effCourse.holes.reduce((s, h) => s + h.par, 0), tees: { [p.tee]: { [sex]: { slope: parseFloat(p.mSlope), sss: parseFloat(p.mSss) } } } };
            preview = playingHandicap(idxHcp, fake, p.tee, sex, alwPct);
          }
          const openRow = expandedRow === i;
          return (
            <div key={i} style={{ borderBottom: i < players.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px" }}>
                <Avatar name={p.name} i={i} size={38} />
                <input value={p.name} onChange={e => update(i, "name", e.target.value)} placeholder={"Joueur " + (i + 1)}
                  style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 15, fontWeight: 700, background: "transparent", color: C.ink }} />
                <span style={{ fontSize: 12, color: C.rust, fontWeight: 700, whiteSpace: "nowrap" }}>Jeu {preview != null ? preview : "—"}</span>
                <button onClick={() => setExpandedRow(openRow ? -1 : i)} style={{ background: "none", border: "none", color: C.sub, fontSize: 16, cursor: "pointer" }}>{openRow ? "▾" : "⋯"}</button>
              </div>
              {openRow && (
                <div style={{ padding: "0 14px 14px" }}>
                  {roster && roster.length > 0 && (
                    <select value="" onChange={e => pickFromRoster(i, e.target.value)} style={{ ...input(), marginBottom: 8, padding: "9px 8px", fontSize: 13 }}>
                      <option value="">— Charger un joueur enregistré —</option>
                      {roster.map(rp => <option key={rp.name} value={rp.name}>{rp.name} (idx {rp.hcp})</option>)}
                    </select>
                  )}
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: C.sub }}>Index</label>
                      <input type="number" step="0.1" value={p.hcp} onChange={e => update(i, "hcp", e.target.value)} style={{ ...input(), marginBottom: 0 }} placeholder="Index" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: C.sub }}>Départ</label>
                      <select value={p.tee} onChange={e => update(i, "tee", e.target.value)} style={{ ...input(), marginBottom: 0, padding: "12px 6px" }}>
                        {TEES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 11, color: C.sub }}>Sexe</label>
                      <select value={sex} onChange={e => update(i, "sex", e.target.value)} style={{ ...input(), marginBottom: 0, padding: "12px 6px" }}>
                        <option value="M">M</option>
                        <option value="D">D</option>
                      </select>
                    </div>
                  </div>
                  {!hasData && (
                    <div style={{ marginTop: 8, background: "#faf0e0", border: `1px solid ${C.rust}`, borderRadius: 10, padding: 8 }}>
                      <div style={{ fontSize: 11, color: C.rust, marginBottom: 6 }}>Pas de Slope/SSS {sex === "D" ? "Dames" : "Messieurs"} pour {p.tee}. Saisissez-les, sinon index brut.</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input type="number" value={p.mSlope} onChange={e => update(i, "mSlope", e.target.value)} style={{ ...input(), marginBottom: 0, flex: 1, fontSize: 13 }} placeholder="Slope" />
                        <input type="number" step="0.1" value={p.mSss} onChange={e => update(i, "mSss", e.target.value)} style={{ ...input(), marginBottom: 0, flex: 1, fontSize: 13 }} placeholder="SSS" />
                      </div>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
                    <button onClick={() => saveToRoster(i)} style={{ background: "none", border: "none", color: C.green, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>Enregistrer ce joueur</button>
                    {players.length > 1 && <button onClick={() => { remove(i); setExpandedRow(-1); }} style={{ background: "none", border: "none", color: C.rust, fontSize: 13, cursor: "pointer", padding: 0, marginLeft: "auto" }}>Retirer</button>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <button onClick={addPlayer} style={{ width: "100%", padding: "14px", border: "none", background: "none", color: C.green, fontSize: 14, fontWeight: 700, cursor: "pointer", borderTop: `1px solid ${C.line}` }}>+ Ajouter un joueur</button>
      </div>

      <button onClick={start} style={{ width: "100%", padding: 16, marginTop: 18, borderRadius: 18, border: "none", background: C.green, color: "#fff", fontSize: 17, fontWeight: 700, cursor: "pointer" }}>Tee off</button>
    </div>
  );
}

function Play({ round, onUpdate, onFinish, onBack }) {
  const [hole, setHole] = useState(0);
  const h = round.holes[hole];
  const nbHoles = round.holes.length;
  const formats = roundFormats(round);
  // On affiche les coups rendus dès qu'une formule NET est jouée
  const hasNet = formats.some(f => f === "stableford" || f === "strokeplay" || f === "matchplay" || f === "chouette_net");
  // Badge en direct : priorité Stableford (le plus parlant), sinon Chouette
  const liveStableford = formats.includes("stableford") ? "stableford"
    : formats.includes("stableford_brut") ? "stableford_brut" : null;
  const liveChouette = !liveStableford
    ? (formats.includes("chouette_net") ? "chouette_net" : formats.includes("chouette_brut") ? "chouette_brut" : null)
    : null;

  function setScore(pi, val) {
    const players = round.players.map((p, i) => {
      if (i !== pi) return p;
      const scores = [...p.scores];
      scores[hole] = val === "" ? "" : parseInt(val, 10);
      return { ...p, scores };
    });
    onUpdate({ ...round, players });
  }
  function quick(pi, delta) {
    const p = round.players[pi];
    const cur = p.scores[hole] === "" ? h.par : p.scores[hole];
    setScore(pi, Math.max(1, cur + delta));
  }

  // Total cumulé (brut) et écart au par joué pour chaque joueur, jusqu'au trou courant inclus
  function runningTotals(pi) {
    const p = round.players[pi];
    let strokes = 0, parPlayed = 0, holesDone = 0;
    round.holes.forEach((hh, i) => {
      const s = p.scores[i];
      if (s === "" || s == null) return;
      strokes += s; parPlayed += hh.par; holesDone++;
    });
    const diff = strokes - parPlayed;
    return { strokes, diff, holesDone };
  }
  const diffLabel = (d) => d === 0 ? "E" : d > 0 ? "+" + d : String(d);

  return (
    <div style={{ paddingBottom: 96 }}>
      {/* Bannière verte du trou */}
      <div style={{ background: C.green, color: "#fff", borderRadius: 20, padding: "16px 18px 18px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={onBack} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 16, cursor: "pointer" }}>‹</button>
          <div style={{ fontSize: 12, opacity: .9, textAlign: "center", flex: 1, padding: "0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{round.courseName} · {formats.map(fmtLabel).join(" · ")}</div>
          <button onClick={() => onFinish(round)} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(255,255,255,.18)", color: "#fff", fontSize: 15, cursor: "pointer" }}>☰</button>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 12, opacity: .85, letterSpacing: 1, textTransform: "uppercase" }}>Trou</div>
            <div style={{ fontFamily: SERIF, fontSize: 56, fontWeight: 700, lineHeight: .9 }}>{hole + 1}</div>
          </div>
          <div style={{ textAlign: "right", paddingBottom: 6 }}>
            <div style={{ fontSize: 13, opacity: .85 }}>Par <b style={{ fontSize: 18 }}>{h.par}</b></div>
            <div style={{ fontSize: 13, opacity: .85 }}>HCP {h.si}</div>
          </div>
        </div>
        {/* Barre de progression segmentée */}
        <div style={{ display: "flex", gap: 3, marginTop: 14 }}>
          {round.holes.map((hh, i) => (
            <div key={i} onClick={() => setHole(i)} style={{ flex: 1, height: 5, borderRadius: 3, cursor: "pointer",
              background: i === hole ? "#fff" : (round.players.every(pl => pl.scores[i] !== "" && pl.scores[i] != null) ? "rgba(255,255,255,.7)" : "rgba(255,255,255,.25)") }} />
          ))}
        </div>
      </div>

      {(() => {
        const chouetteLive = liveChouette
          ? chouettePoints(round.players.map(pl => {
              const s = pl.scores[hole];
              if (s === "" || s == null) return s;
              return liveChouette === "chouette_net" ? s - strokesOnHole(pl.playing, h.si, nbHoles) : s;
            }))
          : null;
        return round.players.map((p, pi) => {
        const rec = strokesOnHole(p.playing, h.si, nbHoles);
        const val = p.scores[hole];
        const pts = liveStableford
          ? stablefordPoints(val, h.par, liveStableford === "stableford" ? rec : 0)
          : chouetteLive ? chouetteLive[pi] : null;
        const rt = runningTotals(pi);
        return (
          <div key={p.id} style={{ background: "#fff", borderRadius: 16, padding: 12, marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar name={p.name} i={pi} size={38} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.sub }}>
                  Total {rt.holesDone ? diffLabel(rt.diff) : "E"} · {rt.strokes || 0}
                  {hasNet && rec > 0 && <span> · {rec} rendu{rec > 1 ? "s" : ""}</span>}
                </div>
              </div>
              <button onClick={() => quick(pi, -1)} style={stepBtn()}>−</button>
              <input type="number" inputMode="numeric" value={val} onChange={e => setScore(pi, e.target.value)} placeholder={String(h.par)}
                style={{ width: 46, height: 46, textAlign: "center", fontSize: 20, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 12, background: C.cream, color: C.text, boxSizing: "border-box" }} />
              <button onClick={() => quick(pi, 1)} style={stepBtn()}>+</button>
            </div>
            {val != null && val !== "" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
                <ScoreMark value={val} par={h.par} size={28} />
                <span style={{ fontSize: 12, color: C.sub }}>sur ce trou (par {h.par})</span>
                {pts != null && <span style={{ marginLeft: "auto", background: C.greenLight, color: C.green, borderRadius: 20, padding: "3px 10px", fontWeight: 700, fontSize: 13 }}>{pts} pt</span>}
              </div>
            )}
          </div>
        );
      });
      })()}

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button onClick={() => setHole(Math.max(0, hole - 1))} disabled={hole === 0}
          style={{ flex: 1, padding: 14, borderRadius: 16, border: `1px solid ${C.border}`, background: hole === 0 ? "#f0f0ee" : "#fff", color: hole === 0 ? "#bbb" : C.text, fontSize: 15, fontWeight: 700, cursor: hole === 0 ? "default" : "pointer" }}>← Trou {hole}</button>
        {hole < nbHoles - 1
          ? <button onClick={() => setHole(hole + 1)} style={{ flex: 2, padding: 14, borderRadius: 16, border: "none", background: C.green, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Suivant · Trou {hole + 2} →</button>
          : <button onClick={() => onFinish(round)} style={{ flex: 2, padding: 14, borderRadius: 16, border: "none", background: C.green, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Voir le classement →</button>}
      </div>
    </div>
  );
}

function Results({ round, onBack, onEdit, backupNeeded, onBackupDone }) {
  const nbHoles = round.holes.length;
  const formats = roundFormats(round);
  const played0 = round.players[0] ? round.players[0].scores.filter(s => s !== "" && s != null).length : 0;
  // La carte de score utilise le brut si TOUTES les formules sont en brut
  const gridBrut = formats.every(f => f.includes("brut") || f === "scramble" || f === "chouette_brut" || f === "chouette");
  // Accordéon : première formule ouverte par défaut
  const [openFmt, setOpenFmt] = useState(formats[0]);
  const toggle = (f) => setOpenFmt(cur => cur === f ? null : f);

  return (
    <div>
      <ScreenHeader title="Classement" onBack={onBack} />
      <div style={{ fontSize: 13, color: C.sub, margin: "-8px 0 14px" }}>{round.courseName} · {new Date(round.createdAt).toLocaleDateString("fr-FR")}</div>
      {backupNeeded && <div style={{ marginBottom: 14 }}><BackupBanner onCopied={onBackupDone} /></div>}

      {formats.map((format) => {
        const { header, sorted, metric, detail, isChouette } = computeFormat(round, format);
        const isPoints = isChouette || format.startsWith("stableford");
        const open = openFmt === format;
        const winner = sorted[0];
        // valeur "principale" affichée à droite de chaque joueur
        const mainVal = (r) => metric(r);
        // écart au par (brut) pour la ligne secondaire
        const parTotal = round.holes.reduce((s, h) => s + h.par, 0);
        return (
          <div key={format} style={{ marginBottom: 12, background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
            <button onClick={() => toggle(format)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "none", color: C.text, border: "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 18 }}>{fmtLabel(format)}</span>
              {!open && winner && <span style={{ fontSize: 12, color: C.rust, fontWeight: 700, marginLeft: 2 }}>{winner.name} · {mainVal(winner)}</span>}
              <span style={{ marginLeft: "auto", fontSize: 16, color: C.sub, transform: open ? "rotate(90deg)" : "none" }}>›</span>
            </button>
            {open && (
              <div style={{ padding: "0 12px 14px" }}>
                {format === "matchplay" && round.players.length === 2 && <div style={{ marginBottom: 10 }}><MatchPlay round={round} /></div>}
                {sorted.map((r, i) => {
                  const first = i === 0;
                  const diff = r.gross ? r.gross - (r.played === round.holes.length ? parTotal : round.holes.slice(0, r.played).reduce((s, h) => s + h.par, 0)) : 0;
                  const diffTxt = diff === 0 ? "E" : diff > 0 ? "+" + diff : String(diff);
                  const pi = round.players.findIndex(x => x.id === r.id);
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, marginBottom: 8,
                      background: first ? C.green : "#eef0ec", color: first ? "#fff" : C.ink, border: first ? "none" : `1px solid ${C.border}` }}>
                      <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 20, width: 22, textAlign: "center", color: first ? "#fff" : C.sub }}>{i + 1}</span>
                      <Avatar name={r.name} i={pi < 0 ? i : pi} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: first ? "#fff" : C.ink }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: first ? "rgba(255,255,255,.9)" : C.sub }}>idx {r.hcp} · jeu {r.playing} · brut {r.gross || "–"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 17, color: first ? "#fff" : C.ink }}>{mainVal(r)}</div>
                        <div style={{ fontSize: 11, color: first ? "rgba(255,255,255,.9)" : C.sub }}>{diffTxt}</div>
                      </div>
                    </div>
                  );
                })}
                <DetailGrid round={round} detail={detail} label={isPoints ? "Points par trou" : "Score par trou"} />
              </div>
            )}
          </div>
        );
      })}

      <h3 style={h3()}>Carte de score</h3>
      <div style={{ background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
        <ScoreGrid round={round} brutFormat={gridBrut} />
        <div style={{ display: "flex", gap: 14, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.sub }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: C.rust, display: "inline-block" }}></span> sous le par</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.sub }}><span style={{ width: 14, height: 14, borderRadius: 3, background: C.ink, display: "inline-block" }}></span> au-dessus du par</span>
        </div>
      </div>

      <h3 style={h3()}>Coups rendus par trou</h3>
      <div style={{ background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
        <RecapRendus round={round} />
      </div>
      <p style={{ fontSize: 11, color: C.sub, marginTop: 10 }}>
        {played0 < nbHoles ? `⚠ Partie en cours (${played0}/${nbHoles} trous saisis pour le 1er joueur).` : "Tous les trous saisis."}
      </p>

      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={onEdit} style={{ flex: 1, padding: 15, borderRadius: 16, border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Corriger les scores</button>
        <button onClick={onBack} style={{ flex: 1, padding: 15, borderRadius: 16, border: "none", background: C.green, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Terminer</button>
      </div>
    </div>
  );
}

function MatchPlay({ round }) {
  const [a, b] = round.players;
  const nb = round.holes.length;
  let running = 0;
  const progress = round.holes.map((h, i) => {
    const sa = a.scores[i], sb = b.scores[i];
    if (sa === "" || sb === "" || sa == null || sb == null) return null;
    const na = sa - strokesOnHole(a.playing, h.si, nb);
    const nbn = sb - strokesOnHole(b.playing, h.si, nb);
    if (na < nbn) running++; else if (nbn < na) running--;
    return running;
  });
  const holesPlayed = progress.filter(x => x !== null).length;
  const diff = running;
  const leader = diff > 0 ? a.name : diff < 0 ? b.name : null;

  const matchLabel = (v) => {
    if (v == null) return "·";
    if (v === 0) return "E";
    const who = v > 0 ? a.name : b.name;
    return `${Math.abs(v)} ${(who[0] || "").toUpperCase()}`;
  };
  const netCell = (p, idx) => {
    const s = p.scores[idx];
    if (s === "" || s == null) return "·";
    return s - strokesOnHole(p.playing, round.holes[idx].si, nb);
  };

  const Section = ({ from, to, title }) => (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 2 }}>{title} (net)</div>
      <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
        <thead>
          <tr><th style={gth()}>Trou</th>{round.holes.slice(from, to).map((h, i) => <th key={i} style={gth()}>{from + i + 1}</th>)}</tr>
        </thead>
        <tbody>
          {[a, b].map(p => (
            <tr key={p.id}>
              <td style={gtd(true)}>{p.name.slice(0, 6)}</td>
              {round.holes.slice(from, to).map((h, i) => <td key={i} style={gtd()}>{netCell(p, from + i)}</td>)}
            </tr>
          ))}
          <tr>
            <td style={gtd(true)}>Match</td>
            {progress.slice(from, to).map((v, i) => (
              <td key={i} style={{ ...gtd(), whiteSpace: "nowrap", fontWeight: v ? 700 : 400, color: v == null ? C.sub : v === 0 ? C.text : C.green }}>{matchLabel(v)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ ...card(), flexDirection: "column", alignItems: "stretch", background: "#eef3ec" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: C.green }}>{leader ? `${leader} — ${Math.abs(diff)} UP` : "All Square"}</div>
        <div style={{ fontSize: 12, color: C.sub }}>{nb - holesPlayed} trou(s) à jouer · net</div>
      </div>
      <Section from={0} to={Math.min(9, nb)} title="Aller" />
      {nb > 9 && <Section from={9} to={nb} title="Retour" />}
      <div style={{ fontSize: 10, color: C.sub, marginTop: 4 }}>Ligne Match : trous d'avance + initiale du meneur · E = égalité</div>
    </div>
  );
}

// Détail par joueur par trou (points ou score) pour une formule
function DetailGrid({ round, detail, label }) {
  const Section = ({ from, to, title }) => (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 2 }}>{title}</div>
      <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
        <thead>
          <tr><th style={gth()}>Trou</th>{round.holes.slice(from, to).map((h, i) => <th key={i} style={gth()}>{from + i + 1}</th>)}<th style={gth()}>Σ</th></tr>
        </thead>
        <tbody>
          {round.players.map((p, pi) => {
            const seg = detail[pi].slice(from, to);
            const sum = detail[pi].reduce((s, v) => s + (v == null ? 0 : v), 0);
            return (
              <tr key={p.id}>
                <td style={gtd(true)}>{p.name.slice(0, 6)}</td>
                {seg.map((v, i) => <td key={i} style={gtd()}>{v == null ? "·" : v}</td>)}
                <td style={gtd(true)}>{sum || "–"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  const nb = round.holes.length;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.greenLight }}>{label}</div>
      <Section from={0} to={Math.min(9, nb)} title="Aller" />
      {nb > 9 && <Section from={9} to={nb} title="Retour" />}
    </div>
  );
}

// Récapitulatif des coups rendus par joueur sur chaque trou (identique pour toute formule nette)
function RecapRendus({ round }) {
  const nb = round.holes.length;
  const Section = ({ from, to, title }) => (
    <div style={{ overflowX: "auto", marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.sub, marginBottom: 2 }}>{title}</div>
      <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: "100%" }}>
        <thead>
          <tr><th style={gth()}>Trou</th>{round.holes.slice(from, to).map((h, i) => <th key={i} style={gth()}>{from + i + 1}</th>)}<th style={gth()}>Σ</th></tr>
          <tr><td style={gtd(true)}>HCP</td>{round.holes.slice(from, to).map((h, i) => <td key={i} style={gtd()}>{h.si}</td>)}<td style={gtd(true)}></td></tr>
        </thead>
        <tbody>
          {round.players.map((p) => {
            let total = 0;
            const cells = round.holes.slice(from, to).map((h, i) => {
              const rec = strokesOnHole(p.playing, h.si, nb);
              return rec;
            });
            round.holes.forEach(h => { total += strokesOnHole(p.playing, h.si, nb); });
            return (
              <tr key={p.id}>
                <td style={gtd(true)}>{p.name.slice(0, 6)}<div style={{ fontSize: 9, color: C.sub }}>jeu {p.playing}</div></td>
                {cells.map((rec, i) => <td key={i} style={{ ...gtd(), background: rec > 0 ? "#fdf3d0" : "transparent", fontWeight: rec > 0 ? 700 : 400, color: rec > 0 ? C.gold : C.sub }}>{rec}</td>)}
                <td style={gtd(true)}>{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
  return (
    <div>
      <Section from={0} to={Math.min(9, nb)} title="Aller" />
      {nb > 9 && <Section from={9} to={nb} title="Retour" />}
    </div>
  );
}

function ScoreGrid({ round, brutFormat }) {
  const nb = round.holes.length;
  // Cellule façon Card & Pencil : carré noir (au-dessus par), rond orange (sous par), simple sinon
  const cell = (s, par) => {
    if (s === "" || s == null) return <span style={{ color: C.sub }}>·</span>;
    const d = s - par;
    if (d === 0) return <span style={{ fontWeight: 500 }}>{s}</span>;
    const bg = d < 0 ? C.rust : C.ink;
    const shape = d < 0 ? "50%" : 5;
    return <span style={{ display: "inline-flex", width: 22, height: 22, alignItems: "center", justifyContent: "center", background: bg, color: "#fff", borderRadius: shape, fontSize: 12, fontWeight: 700 }}>{s}</span>;
  };
  const Section = ({ holes, offset, title }) => holes.length ? (
    <div style={{ overflowX: "auto", marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.sub, marginBottom: 4 }}>{title}</div>
      <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: "100%" }}>
        <thead>
          <tr><th style={gth()}>Trou</th>{holes.map((h, i) => <th key={i} style={gth()}>{offset + i + 1}</th>)}<th style={gth()}>Σ</th></tr>
          <tr><td style={gtd(true)}>Par</td>{holes.map((h, i) => <td key={i} style={gtd()}>{h.par}</td>)}<td style={gtd(true)}>{holes.reduce((s, h) => s + h.par, 0)}</td></tr>
        </thead>
        <tbody>
          {round.players.map(p => (
            <tr key={p.id}>
              <td style={gtd(true)}>{p.name.slice(0, 6)}</td>
              {holes.map((h, i) => {
                const idx = offset + i, s = p.scores[idx];
                const rec = brutFormat ? 0 : strokesOnHole(p.playing, h.si, nb);
                return <td key={i} style={{ ...gtd(), position: "relative", padding: "4px 5px" }}>{cell(s, h.par)}{rec > 0 && <sup style={{ color: C.rust, position: "absolute", top: 1, right: 2, fontSize: 8 }}>{rec}</sup>}</td>;
              })}
              <td style={gtd(true)}>{holes.reduce((sum, h, i) => { const s = p.scores[offset + i]; return sum + (s === "" || s == null ? 0 : s); }, 0) || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;
  return <div><Section holes={round.holes.slice(0, 9)} offset={0} title="Aller" /><Section holes={round.holes.slice(9)} offset={9} title="Retour" /></div>;
}

function Courses({ courses, onSave, onBack }) {
  const [list, setList] = useState(courses.length ? courses : [defaultCourse()]);
  const [sel, setSel] = useState(0);
  const c = list[sel];

  function updateHole(i, k, v) {
    const nl = [...list];
    let val = "";
    if (v !== "") { const n = parseInt(v, 10); val = isNaN(n) ? "" : n; }
    nl[sel] = { ...nl[sel], holes: nl[sel].holes.map((h, j) => j === i ? { ...h, [k]: val } : h) };
    setList(nl);
  }
  function updateName(v) { const nl = [...list]; nl[sel] = { ...nl[sel], name: v }; setList(nl); }
  function updateTee(tee, sex, field, v) {
    const nl = [...list];
    const cur = nl[sel];
    const tees = { ...(cur.tees || {}) };
    const teeObj = { ...(tees[tee] || { M: null, D: null }) };
    const val = { ...(teeObj[sex] || { slope: null, sss: null }) };
    val[field] = v === "" ? null : parseFloat(v);
    if (val.slope == null && val.sss == null) teeObj[sex] = null; else teeObj[sex] = val;
    tees[tee] = teeObj;
    nl[sel] = { ...cur, tees };
    setList(nl);
  }
  function addCourse() {
    const blank = { name: "Parcours " + (list.length + 1), par: 72,
      holes: Array.from({ length: 18 }, () => ({ par: "", si: "" })),
      tees: { Noir: { M: null, D: null }, Blanc: { M: null, D: null }, Jaune: { M: null, D: null }, Bleu: { M: null, D: null }, Rouge: { M: null, D: null } } };
    const nl = [...list, blank]; setList(nl); setSel(nl.length - 1);
  }
  function removeCourse() { if (list.length <= 1) return; const nl = list.filter((_, i) => i !== sel); setList(nl); setSel(0); }
  const tv = (tee, sex, field) => { const t = c.tees && c.tees[tee] ? c.tees[tee][sex] : null; return t && t[field] != null ? t[field] : ""; };

  return (
    <div>
      <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, margin: "4px 0 16px" }}>Parcours</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Sélection</div>
      <select value={sel} onChange={e => setSel(parseInt(e.target.value))} style={input()}>
        {list.map((x, i) => <option key={i} value={i}>{x.name}</option>)}
      </select>
      <input value={c.name} onChange={e => updateName(e.target.value)} style={input()} placeholder="Nom du parcours" />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={addCourse} style={{ flex: 1, padding: 13, borderRadius: 14, border: `1px solid ${C.border}`, background: "#fff", color: C.green, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>+ Parcours</button>
        {list.length > 1 && <button onClick={removeCourse} style={{ flex: 1, padding: 13, borderRadius: 14, border: `1px solid ${C.rust}`, background: "#fff", color: C.rust, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Supprimer</button>}
      </div>

      <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, margin: "20px 0 10px" }}>Trous</div>
      <div style={{ background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12, width: "100%" }}>
          <thead><tr><th style={gth()}>Trou</th><th style={gth()}>Par</th><th style={gth()}>HCP</th></tr></thead>
          <tbody>
            {c.holes.map((h, i) => (
              <tr key={i}>
                <td style={gtd(true)}>{i + 1}</td>
                <td style={gtd()}><input type="number" value={h.par} onChange={e => updateHole(i, "par", e.target.value)} style={cellInput()} /></td>
                <td style={gtd()}><input type="number" value={h.si} onChange={e => updateHole(i, "si", e.target.value)} style={cellInput()} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: C.sub, marginTop: 8 }}>HCP 1 = trou le plus difficile. Par total : {c.holes.reduce((s, h) => s + (parseInt(h.par, 10) || 0), 0)}.</p>
      </div>

      <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, margin: "20px 0 10px" }}>Slope / SSS par départ</div>
      <div style={{ background: "#fff", borderRadius: 16, padding: 12, boxShadow: "0 1px 3px rgba(0,0,0,.05)", overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
          <thead>
            <tr><th style={gth()}>Départ</th><th style={gth()}>Slope M</th><th style={gth()}>SSS M</th><th style={gth()}>Slope D</th><th style={gth()}>SSS D</th></tr>
          </thead>
          <tbody>
            {TEES.map((t, i) => (
              <tr key={t.name}>
                <td style={gtd(true)}><TeePill tee={t.name} /></td>
                <td style={gtd()}><input type="number" value={tv(t.name, "M", "slope")} onChange={e => updateTee(t.name, "M", "slope", e.target.value)} style={cellInput()} /></td>
                <td style={gtd()}><input type="number" step="0.1" value={tv(t.name, "M", "sss")} onChange={e => updateTee(t.name, "M", "sss", e.target.value)} style={cellInput()} /></td>
                <td style={gtd()}><input type="number" value={tv(t.name, "D", "slope")} onChange={e => updateTee(t.name, "D", "slope", e.target.value)} style={cellInput()} /></td>
                <td style={gtd()}><input type="number" step="0.1" value={tv(t.name, "D", "sss")} onChange={e => updateTee(t.name, "D", "sss", e.target.value)} style={cellInput()} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 11, color: C.sub, marginTop: 8 }}>Laissez vide un départ sans valeur officielle (ex. Noir/Blanc Dames).</p>
      </div>

      <button onClick={() => {
        const clean = list.map(cc => ({ ...cc, holes: cc.holes.map(h => ({ par: h.par === "" || h.par == null ? 0 : h.par, si: h.si === "" || h.si == null ? 0 : h.si })) }));
        onSave(clean);
      }} style={{ width: "100%", padding: 16, marginTop: 18, borderRadius: 18, border: "none", background: C.green, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
    </div>
  );
}

function Players({ roster, onSave, onBack }) {
  const [list, setList] = useState(roster || []);
  function update(i, k, v) { const nl = [...list]; nl[i] = { ...nl[i], [k]: v }; setList(nl); }
  function add() { setList([...list, { name: "", hcp: 18, tee: "Jaune", sex: "M" }]); }
  function remove(i) { setList(list.filter((_, j) => j !== i)); }
  function save() {
    const clean = list.filter(p => p.name && p.name.trim())
      .map(p => ({ name: p.name.trim(), hcp: parseFloat(p.hcp) || 0, tee: p.tee || "Jaune", sex: p.sex || "M" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    onSave(clean); onBack();
  }
  return (
    <div>
      <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, margin: "4px 0 16px" }}>Joueurs</div>
      {list.length === 0 && <p style={{ fontSize: 14, color: C.sub }}>Aucun joueur enregistré. Ajoutez-en, ou enregistrez-les depuis une Nouvelle partie.</p>}
      <div style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
        {list.map((p, i) => (
          <div key={i} style={{ padding: "12px 14px", borderBottom: i < list.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Avatar name={p.name} i={i} size={40} />
              <input value={p.name} onChange={e => update(i, "name", e.target.value)} placeholder="Nom" style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 15, fontWeight: 700, background: "transparent", color: C.ink }} />
              <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: C.rust, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.sub }}>Index</label>
                <input type="number" step="0.1" value={p.hcp} onChange={e => update(i, "hcp", e.target.value)} style={{ ...input(), marginBottom: 0 }} placeholder="Index" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.sub }}>Départ</label>
                <select value={p.tee || "Jaune"} onChange={e => update(i, "tee", e.target.value)} style={{ ...input(), marginBottom: 0, padding: "12px 6px" }}>
                  {TEES.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: C.sub }}>Sexe</label>
                <select value={p.sex || "M"} onChange={e => update(i, "sex", e.target.value)} style={{ ...input(), marginBottom: 0, padding: "12px 6px" }}>
                  <option value="M">M</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        <button onClick={add} style={{ width: "100%", padding: 14, border: "none", background: "none", color: C.green, fontSize: 14, fontWeight: 700, cursor: "pointer", borderTop: list.length ? `1px solid ${C.line}` : "none" }}>+ Ajouter un joueur</button>
      </div>
      <p style={{ fontSize: 11, color: C.sub, margin: "10px 0" }}>Index, départ et sexe sont repris à chaque partie, modifiables au cas par cas.</p>
      <button onClick={save} style={{ width: "100%", padding: 16, borderRadius: 18, border: "none", background: C.green, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Enregistrer</button>
    </div>
  );
}

// ---------- Sauvegarde / Restauration ----------
async function collectData() {
  const idx = (await store.get("rounds:index")) || [];
  const rounds = {};
  for (const id of idx) { const r = await store.get("round:" + id); if (r) rounds[id] = r; }
  return {
    version: 1, exportedAt: new Date().toISOString(),
    courses: (await store.get("courses")) || [],
    roster: (await store.get("players:roster")) || [],
    roundsIndex: idx, rounds,
  };
}
async function applyData(data) {
  if (!data || typeof data !== "object") throw new Error("Format invalide");
  if (data.courses) await store.set("courses", data.courses);
  if (data.roster) await store.set("players:roster", data.roster);
  if (data.roundsIndex) await store.set("rounds:index", data.roundsIndex);
  if (data.rounds) { for (const id in data.rounds) { await store.set("round:" + id, data.rounds[id]); } }
}
// Accepte le JSON brut OU le texte préfixé "GOLF-SCORE-BACKUP {...}" collé depuis le chat
function parseBackupText(raw) {
  let s = (raw || "").trim();
  const tag = "GOLF-SCORE-BACKUP";
  const at = s.indexOf(tag);
  if (at >= 0) s = s.slice(at + tag.length).trim();
  const first = s.indexOf("{"), last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s);
}

async function copyBackupToClipboard() {
  const data = await collectData();
  const text = "GOLF-SCORE-BACKUP " + JSON.stringify(data);
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return { ok: true, text }; }
  } catch (e) {}
  // secours : textarea + execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy"); document.body.removeChild(ta);
    return { ok, text };
  } catch (e) { return { ok: false, text }; }
}

function BackupBanner({ onCopied }) {
  const [state, setState] = useState("idle"); // idle | copied | show
  const [text, setText] = useState("");
  async function doCopy() {
    const res = await copyBackupToClipboard();
    setText(res.text);
    if (res.ok) { setState("copied"); if (onCopied) await onCopied(); }
    else setState("show");
  }
  return (
    <div style={{ background: "#fdf3d0", border: `1px solid ${C.gold}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#8a6d00", marginBottom: 8 }}>
        {state === "copied" ? "✓ Backup copié — collez-le dans la conversation Claude pour l'archiver." : "💾 Sauvegarde recommandée : des données ont changé depuis le dernier backup."}
      </div>
      {state !== "show" && (
        <button onClick={doCopy} style={{ ...btn(C.green), marginBottom: 0 }}>
          {state === "copied" ? "Copier à nouveau" : "📋 Copier le backup dans le presse-papier"}
        </button>
      )}
      {state === "copied" && <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>Astuce : collez-le dans le chat de temps en temps. En cas de perte, renvoyez-moi ce texte pour tout restaurer.</div>}
      {state === "show" && (
        <div>
          <div style={{ fontSize: 11, color: "#8a6d00", marginBottom: 6 }}>Copie automatique impossible ici — sélectionnez ce texte et copiez-le manuellement :</div>
          <textarea readOnly value={text} onFocus={e => e.target.select()} style={{ width: "100%", height: 90, fontSize: 10, border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, boxSizing: "border-box" }} />
        </div>
      )}
    </div>
  );
}

function DataScreen({ onReload, onBack }) {
  const [text, setText] = useState("");
  const [importText, setImportText] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => { (async () => { setText(JSON.stringify(await collectData())); })(); }, []);

  async function download() {
    const data = await collectData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "golf-score-sauvegarde.json";
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }
  function copy() {
    const ta = document.getElementById("exp-ta");
    if (ta) { ta.select(); try { document.execCommand("copy"); setMsg("Texte copié."); } catch (e) { setMsg("Sélectionnez et copiez manuellement."); } }
  }
  async function restoreFromText() {
    if (!importText.trim()) { setMsg("Collez d'abord le texte de sauvegarde."); return; }
    try { await applyData(parseBackupText(importText)); await onReload(); setMsg("Sauvegarde restaurée ✓"); }
    catch (e) { setMsg("Texte invalide : " + e.message); }
  }
  function restoreFromFile(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try { await applyData(parseBackupText(reader.result)); await onReload(); setMsg("Sauvegarde restaurée ✓"); }
      catch (err) { setMsg("Fichier invalide : " + err.message); }
    };
    reader.readAsText(f);
  }

  return (
    <div>
      <div style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, margin: "4px 0 16px" }}>Réglages</div>
      <h3 style={h3()}>Sauvegarde / Restauration</h3>
      <p style={{ fontSize: 12, color: C.sub }}>Exportez de temps en temps : c'est votre filet de sécurité si les données de l'app venaient à être perdues.</p>

      {msg && <div style={{ background: "#eef3ec", border: `1px solid ${C.green}`, color: C.green, borderRadius: 8, padding: "8px 10px", fontSize: 13, marginBottom: 10 }}>{msg}</div>}

      <h3 style={h3()}>Exporter</h3>
      <button onClick={download} style={btn(C.green)}>⬇ Télécharger la sauvegarde (fichier)</button>
      <p style={{ fontSize: 11, color: C.sub, marginTop: -4 }}>Ou copiez ce texte et collez-le dans une note / un e-mail à vous-même :</p>
      <textarea id="exp-ta" readOnly value={text} style={{ width: "100%", height: 110, fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, boxSizing: "border-box" }} />
      <button onClick={copy} style={btn("#fff", C.green, true)}>📋 Copier le texte</button>

      <h3 style={h3()}>Restaurer</h3>
      <p style={{ fontSize: 11, color: C.sub, marginTop: -4 }}>Importez un fichier, ou collez le texte puis Restaurer. La restauration remplace les données actuelles.</p>
      <input type="file" accept="application/json,.json" onChange={restoreFromFile} style={{ ...input(), padding: 9 }} />
      <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Collez ici le texte de sauvegarde…" style={{ width: "100%", height: 110, fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, boxSizing: "border-box", marginBottom: 8 }} />
      <button onClick={restoreFromText} style={btn(C.green)}>↻ Restaurer depuis le texte</button>
    </div>
  );
}

// ---------- helpers ----------
function roundFormats(round) {
  return round.formats && round.formats.length ? round.formats : [round.format];
}

// Calcule le classement d'UNE formule donnée pour la partie.
function computeFormat(round, format) {
  const nbHoles = round.holes.length;
  const isChouette = format === "chouette_brut" || format === "chouette_net" || format === "chouette";
  const brut = format.includes("brut") || format === "scramble" || format === "chouette_brut" || format === "chouette";

  // détail par joueur par trou (points ou score selon la formule)
  const detail = round.players.map(() => Array(nbHoles).fill(null));

  // Points Chouette cumulés (niveau trou), brut ou net
  let chouetteTotals = null;
  if (isChouette) {
    chouetteTotals = round.players.map(() => 0);
    round.holes.forEach((h, i) => {
      const holeScores = round.players.map(p => {
        const s = p.scores[i];
        if (s === "" || s == null) return s;
        return format === "chouette_net" ? s - strokesOnHole(p.playing, h.si, nbHoles) : s;
      });
      const pts = chouettePoints(holeScores);
      if (pts[0] != null) pts.forEach((pt, pi) => { chouetteTotals[pi] += pt; detail[pi][i] = pt; });
    });
  }

  const rows = round.players.map((p, pi) => {
    let gross = 0, net = 0, points = 0, played = 0;
    round.holes.forEach((h, i) => {
      const s = p.scores[i];
      if (s === "" || s == null) return;
      played++;
      const rec = brut ? 0 : strokesOnHole(p.playing, h.si, nbHoles);
      gross += s; net += s - rec; points += stablefordPoints(s, h.par, rec) || 0;
      if (!isChouette) {
        if (format.startsWith("stableford")) detail[pi][i] = stablefordPoints(s, h.par, rec);
        else detail[pi][i] = brut ? s : s - rec; // score du trou (brut ou net)
      }
    });
    if (chouetteTotals) points = chouetteTotals[pi];
    return { ...p, gross, net, points, played };
  });

  let sorted, metric, header;
  if (isChouette) {
    sorted = [...rows].sort((a, b) => b.points - a.points); metric = r => r.points + " pts"; header = "Chouette";
  } else if (format.startsWith("stableford")) {
    sorted = [...rows].sort((a, b) => b.points - a.points); metric = r => r.points + " pts"; header = "Points";
  } else if (format.startsWith("strokeplay")) {
    sorted = [...rows].sort((a, b) => (brut ? a.gross - b.gross : a.net - b.net)); metric = r => (brut ? r.gross : r.net); header = brut ? "Brut" : "Net";
  } else { // matchplay
    sorted = [...rows].sort((a, b) => a.net - b.net); metric = r => r.net; header = "Net";
  }
  return { header, rows, sorted, metric, brut, detail, isChouette, format };
}

function TeePill({ tee }) {
  if (!tee) return null;
  const s = teeStyle(tee);
  return <span style={{ display: "inline-block", background: s.bg, color: s.txt, border: `1px solid ${C.border}`, borderRadius: 6, padding: "1px 6px", fontSize: 10, fontWeight: 600, verticalAlign: "middle" }}>{tee}</span>;
}
function fmtLabel(f) {
  return { stableford: "Stableford Net", stableford_brut: "Stableford Brut", strokeplay: "Stroke Play Net", strokeplay_brut: "Stroke Play Brut", matchplay: "Match Play", scramble: "Scramble", chouette: "Chouette Brut", chouette_brut: "Chouette Brut", chouette_net: "Chouette Net" }[f] || f;
}
const btn = (bg, color = "#fff", outline = false) => ({ display: "block", width: "100%", padding: "15px", background: bg, color, border: outline ? `1.5px solid ${C.border}` : "none", borderRadius: 16, fontSize: 15, fontWeight: 700, marginBottom: 10, cursor: "pointer", boxShadow: outline ? "none" : "0 1px 3px rgba(0,0,0,.06)" });
const h3 = () => ({ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: C.ink, margin: "20px 0 10px" });
const card = () => ({ display: "flex", alignItems: "center", background: "#fff", border: "none", borderRadius: 16, padding: 14, marginBottom: 10, gap: 8, boxShadow: "0 1px 3px rgba(0,0,0,.05)" });
const input = () => ({ width: "100%", boxSizing: "border-box", padding: "13px 14px", border: `1px solid ${C.border}`, borderRadius: 14, fontSize: 15, marginBottom: 10, background: "#fff", color: C.text });
const stepBtn = () => ({ width: 46, height: 46, borderRadius: "50%", border: "none", background: C.green, color: "#fff", fontSize: 24, fontWeight: 700, cursor: "pointer", flexShrink: 0 });
const navBtn = (d) => ({ width: 44, height: 40, margin: "8px 6px 0", borderRadius: 10, border: "none", background: d ? "#e6e6e6" : C.green, color: d ? "#aaa" : "#fff", fontSize: 22, cursor: d ? "default" : "pointer" });
const th = () => ({ padding: "8px 6px", fontSize: 12, textAlign: "center", fontWeight: 600 });
const td = () => ({ padding: "8px 6px", textAlign: "center", borderBottom: `1px solid ${C.line}` });
const gth = () => ({ padding: "6px 6px", background: "transparent", color: C.sub, fontSize: 11, textAlign: "center", borderBottom: `1px solid ${C.line}`, fontWeight: 600 });
const gtd = (label = false) => ({ padding: "3px 6px", textAlign: "center", fontWeight: label ? 700 : 400, color: label ? C.ink : C.text, background: "transparent", borderBottom: `1px solid ${C.line}`, minWidth: 30 });
const cellInput = () => ({ width: 50, padding: "6px", border: `1px solid ${C.border}`, borderRadius: 6, textAlign: "center", fontSize: 13 });
// Titre de sous-écran avec bouton retour rond, façon Card & Pencil
function ScreenHeader({ title, onBack }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
      {onBack && <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.08)", cursor: "pointer", fontSize: 18 }}>‹</button>}
      <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 700 }}>{title}</div>
    </div>
  );
}
