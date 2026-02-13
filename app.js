/**
 * Anleitungsquiz – Prüfungsvorbereitung Praxisanleitung M II
 * Lernmodus & Prüfungsmodus
 */

let fragenDaten = null;
let aktuelleKategorie = null;
let aktuelleFragen = [];
let aktuelleIndex = 0;
let modus = 'lernen'; // 'lernen' | 'pruefung'
let pruefungsErgebnis = { richtig: 0, falsch: 0 };
const PRUEFUNG_ANZAHL = 20;
const TIMER_DAUER = 60 * 60; // 60 Minuten in Sekunden
let timerIntervall = null;
let timerSekundenRest = 0;

// DOM-Elemente
const modusAuswahl = document.getElementById('modus-auswahl');
const kategorieAuswahl = document.getElementById('kategorie-auswahl');
const kategorieListe = document.getElementById('kategorie-liste');
const quizBereich = document.getElementById('quiz-bereich');
const ergebnisBereich = document.getElementById('ergebnis-bereich');

const karteikarteContainer = document.getElementById('karteikarte-container');
const multiplechoiceContainer = document.getElementById('multiplechoice-container');
const quizFortschritt = document.getElementById('quiz-fortschritt');
const quizKategorie = document.getElementById('quiz-kategorie');

const THEME_KEY = 'anleitungsquiz-theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved === 'dark' || (!saved && prefersDark);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-color')?.setAttribute('content', isDark ? '#0f172a' : '#1a365d');
  updateThemeIcon(isDark);
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const nextDark = !isDark;
  document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light');
  document.getElementById('theme-color')?.setAttribute('content', nextDark ? '#0f172a' : '#1a365d');
  localStorage.setItem(THEME_KEY, nextDark ? 'dark' : 'light');
  updateThemeIcon(nextDark);
}

function updateThemeIcon(isDark) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

// Init
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  initTheme();
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('quiz-timer-btn')?.addEventListener('click', timerStarten);
  try {
    const response = await fetch('fragen.json');
    fragenDaten = await response.json();
    const gesamt = fragenDaten.kategorien.reduce((s, k) => s + k.fragen.length, 0);
    const footer = document.getElementById('footer-fragenanzahl');
    if (footer) footer.textContent = `${gesamt} Fragen · WB-PA-2025`;
    setupEventListeners();
  } catch (err) {
    console.error('Fehler beim Laden der Fragen:', err);
    alert('Fragen konnten nicht geladen werden.');
  }
});

function setupEventListeners() {
  document.getElementById('btn-lernmodus').addEventListener('click', () => {
    modus = 'lernen';
    zeigeKategorieAuswahl();
  });

  document.getElementById('btn-pruefungsmodus').addEventListener('click', () => {
    modus = 'pruefung';
    zeigeKategorieAuswahl();
  });

  document.getElementById('btn-zurueck-modus').addEventListener('click', zeigeModusAuswahl);

  document.getElementById('btn-zurueck').addEventListener('click', () => {
    if (aktuelleIndex > 0) {
      aktuelleIndex--;
      frageAnzeigen();
    } else {
      zeigeKategorieAuswahl();
    }
  });

  document.getElementById('btn-weiter').addEventListener('click', naechsteFrage);

  document.getElementById('btn-antwort-zeigen').addEventListener('click', () => {
    document.getElementById('karteikarte-antwort').classList.remove('hidden');
    document.getElementById('karteikarte-buttons').classList.remove('hidden');
    document.getElementById('btn-antwort-zeigen').classList.add('hidden');
  });

  document.getElementById('btn-gewusst').addEventListener('click', () => karteikarteAntwort(true));
  document.getElementById('btn-nicht-gewusst').addEventListener('click', () => karteikarteAntwort(false));

  document.getElementById('btn-weiter-mc').addEventListener('click', naechsteFrage);

  document.getElementById('btn-neustart').addEventListener('click', () => {
    aktuelleIndex = 0;
    frageAnzeigen();
    ergebnisBereich.classList.add('hidden');
    quizBereich.classList.remove('hidden');
  });

  document.getElementById('btn-zurueck-start').addEventListener('click', () => {
    ergebnisBereich.classList.add('hidden');
    zeigeModusAuswahl();
  });
}

function zeigeModusAuswahl() {
  modusAuswahl.classList.remove('hidden');
  kategorieAuswahl.classList.add('hidden');
  quizBereich.classList.add('hidden');
  ergebnisBereich.classList.add('hidden');
}

function zeigeKategorieAuswahl() {
  timerStoppen();
  modusAuswahl.classList.add('hidden');
  kategorieAuswahl.classList.remove('hidden');
  quizBereich.classList.add('hidden');

  kategorieListe.innerHTML = '';

  // Alle Kategorien + Einzelne
  const alleKategorien = [
    { id: 'alle', name: 'Alle Themen', fragen: fragenDaten.kategorien.flatMap(k => k.fragen) }
  ].concat(fragenDaten.kategorien.map(k => ({
    id: k.id,
    name: k.name,
    fragen: k.fragen
  })));

  alleKategorien.forEach(kat => {
    const item = document.createElement('div');
    item.className = 'kategorie-item';
    const anzahlText = (modus === 'pruefung' && kat.id === 'alle')
      ? `${PRUEFUNG_ANZAHL} Fragen (Prüfungssimulation)`
      : `${kat.fragen.length} Fragen`;
    item.innerHTML = `
      <span class="name">${kat.name}</span>
      <span class="anzahl">${anzahlText}</span>
    `;
    item.addEventListener('click', () => kategorieWaehlen(kat));
    kategorieListe.appendChild(item);
  });
}

function kategorieWaehlen(kategorie) {
  timerStoppen();
  aktuelleKategorie = kategorie;
  if (modus === 'pruefung' && kategorie.id === 'alle') {
    aktuelleFragen = mischePruefungsfragen(PRUEFUNG_ANZAHL);
  } else if (modus === 'pruefung') {
    aktuelleFragen = fisherYatesShuffle([...kategorie.fragen]);
  } else {
    aktuelleFragen = lernmodusFragenMitStatistik(kategorie.fragen);
  }
  aktuelleIndex = 0;
  pruefungsErgebnis = { richtig: 0, falsch: 0 };

  kategorieAuswahl.classList.add('hidden');
  quizBereich.classList.remove('hidden');

  frageAnzeigen();
}

/** Lernmodus: Fragen mit Statistik – „Nochmal“-Fragen erscheinen öfter. */
function lernmodusFragenMitStatistik(fragen) {
  let stat = {};
  try {
    stat = JSON.parse(localStorage.getItem(LERN_STAT_KEY) || '{}');
  } catch (_) {}
  const deck = [];
  fragen.forEach((f) => {
    deck.push(f);
    const s = stat[f.id];
    if (s && s.nochmal > s.gewusst && s.nochmal >= 2) {
      deck.push(f); // Schwer: 1× extra einfügen
    }
  });
  return fisherYatesShuffle(deck);
}

/** Fisher-Yates Shuffle – echte Zufallsverteilung */
function fisherYatesShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Zieht PRUEFUNG_ANZAHL Fragen – 1 pro Thema, Rest zufällig verteilt (echte Zufälligkeit). */
function mischePruefungsfragen(anzahl) {
  const kategorien = fragenDaten.kategorien;
  const ergebnis = [];
  const verwendet = new Set(); // verhindert doppelte Fragen

  // 1. Pro Thema genau 1 zufällige Frage (echter Zufall, nicht immer die gleiche)
  kategorien.forEach((kat) => {
    if (kat.fragen.length === 0) return;
    const gemischt = fisherYatesShuffle(kat.fragen);
    const frage = gemischt[0];
    ergebnis.push(frage);
    verwendet.add(frage.id);
  });

  // 2. Alle übrigen Fragen sammeln (ohne die bereits gewählten)
  const uebrig = [];
  kategorien.forEach((kat) => {
    kat.fragen.forEach((f) => {
      if (!verwendet.has(f.id)) uebrig.push(f);
    });
  });

  // 3. Restliche Plätze mit Fisher-Yates gemischten Fragen füllen
  const nochZuWaehlen = Math.min(anzahl - ergebnis.length, uebrig.length);
  const gemischtUebrig = fisherYatesShuffle(uebrig);
  for (let i = 0; i < nochZuWaehlen; i++) {
    ergebnis.push(gemischtUebrig[i]);
  }

  // 4. Reihenfolge der 20 Fragen zufällig mischen
  return fisherYatesShuffle(ergebnis);
}

function frageAnzeigen() {
  if (aktuelleIndex >= aktuelleFragen.length) {
    if (modus === 'pruefung' && pruefungsErgebnis.richtig + pruefungsErgebnis.falsch > 0) {
      zeigeErgebnis();
    } else {
      zeigeKategorieAuswahl();
    }
    return;
  }

  const frage = aktuelleFragen[aktuelleIndex];
  quizFortschritt.textContent = `${aktuelleIndex + 1} / ${aktuelleFragen.length}`;
  quizKategorie.textContent = aktuelleKategorie.name;

  // Modus-Badge anzeigen
  const modusBadge = document.getElementById('quiz-modus-badge');
  modusBadge.classList.remove('hidden', 'lernmodus', 'pruefungsmodus');
  modusBadge.textContent = modus === 'pruefung' ? 'Prüfungsmodus' : 'Lernmodus';
  modusBadge.classList.add(modus === 'pruefung' ? 'pruefungsmodus' : 'lernmodus');

  // Prüfungsstand & Timer (nur im Prüfungsmodus)
  const pruefungsStand = document.getElementById('quiz-pruefungs-stand');
  const timerBtn = document.getElementById('quiz-timer-btn');
  const timerDisplay = document.getElementById('quiz-timer-display');
  if (modus === 'pruefung') {
    const mcAnzahl = aktuelleFragen.filter(f => f.typ === 'multipleChoice').length;
    pruefungsStand.classList.remove('hidden');
    pruefungsStand.textContent = `${pruefungsErgebnis.richtig} von ${mcAnzahl} richtig`;
    timerBtn?.classList.remove('hidden');
    if (timerIntervall) timerDisplay?.classList.remove('hidden');
  } else {
    pruefungsStand.classList.add('hidden');
    timerBtn?.classList.add('hidden');
    timerDisplay?.classList.add('hidden');
  }

  if (frage.typ === 'karteikarte') {
    karteikarteContainer.classList.remove('hidden');
    multiplechoiceContainer.classList.add('hidden');

    document.getElementById('karteikarte-frage').textContent = frage.frage;
    document.getElementById('karteikarte-antwort').textContent = frage.antwort;
    document.getElementById('karteikarte-antwort').classList.add('hidden');
    document.getElementById('karteikarte-buttons').classList.add('hidden');
    document.getElementById('btn-antwort-zeigen').classList.remove('hidden');

    document.getElementById('btn-weiter').classList.add('hidden');
  } else {
    multiplechoiceContainer.classList.remove('hidden');
    karteikarteContainer.classList.add('hidden');

    document.getElementById('multiplechoice-frage').textContent = frage.frage;

    const optionenDiv = document.getElementById('multiplechoice-optionen');
    optionenDiv.innerHTML = '';
    optionenDiv.querySelectorAll('.mc-option').forEach(el => el.remove());

    frage.optionen.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'mc-option';
      btn.textContent = opt;
      btn.dataset.index = i;
      btn.addEventListener('click', () => mcOptionKlick(frage, i, btn));
      optionenDiv.appendChild(btn);
    });

    const feedback = document.getElementById('multiplechoice-feedback');
    feedback.classList.add('hidden');
    feedback.className = 'multiplechoice-feedback hidden';

    document.getElementById('btn-weiter-mc').classList.add('hidden');
    document.getElementById('btn-weiter').classList.remove('hidden');
  }
}

let mcBeantwortet = false;

function mcOptionKlick(frage, gewaehltIndex, btn) {
  if (mcBeantwortet) return;

  mcBeantwortet = true;
  const optionen = document.querySelectorAll('.mc-option');
  optionen.forEach(o => o.classList.add('deaktiviert'));

  const richtig = gewaehltIndex === frage.richtigeAntwort;

  if (modus === 'pruefung') {
    if (richtig) pruefungsErgebnis.richtig++;
    else pruefungsErgebnis.falsch++;
    // Prüfungsstand live aktualisieren
    const mcAnzahl = aktuelleFragen.filter(f => f.typ === 'multipleChoice').length;
    document.getElementById('quiz-pruefungs-stand').textContent =
      `${pruefungsErgebnis.richtig} von ${mcAnzahl} richtig`;
  }

  btn.classList.add(richtig ? 'richtig' : 'falsch');
  optionen[frage.richtigeAntwort].classList.add('richtig');

  const feedback = document.getElementById('multiplechoice-feedback');
  feedback.classList.remove('hidden');
  feedback.className = 'multiplechoice-feedback ' + (richtig ? 'richtig' : 'falsch');
  feedback.textContent = (richtig ? '✓ Richtig! ' : '✗ Leider falsch. ') + (frage.erklaerung || '');
  feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  document.getElementById('btn-weiter').classList.add('hidden');
  document.getElementById('btn-weiter-mc').classList.remove('hidden');
}

function naechsteFrage() {
  mcBeantwortet = false;
  aktuelleIndex++;
  frageAnzeigen();
}

const LERN_STAT_KEY = 'anleitungsquiz-lernstat';

/** Speichert Gewusst/Nochmal pro Frage-ID für spätere Gewichtung. */
function lernStatSpeichern(frageId, gewusst) {
  try {
    const stat = JSON.parse(localStorage.getItem(LERN_STAT_KEY) || '{}');
    if (!stat[frageId]) stat[frageId] = { gewusst: 0, nochmal: 0 };
    if (gewusst) stat[frageId].gewusst++;
    else stat[frageId].nochmal++;
    localStorage.setItem(LERN_STAT_KEY, JSON.stringify(stat));
  } catch (_) {}
}

/** Karteikarte: Gewusst = weiter, Nochmal = Frage später wieder einfügen + Statistik (nur Lernmodus). */
function karteikarteAntwort(gewusst) {
  const frage = aktuelleFragen[aktuelleIndex];

  if (modus === 'pruefung') {
    // Prüfungssimulation: immer nur weiter, keine Duplikate
    naechsteFrage();
    return;
  }

  if (frage?.id) lernStatSpeichern(frage.id, gewusst);

  if (gewusst) {
    naechsteFrage();
    return;
  }

  // Nochmal (nur Lernmodus): Frage 2–4 Positionen später erneut einfügen
  const wiederIn = Math.min(aktuelleIndex + 2 + Math.floor(Math.random() * 3), aktuelleFragen.length);
  aktuelleFragen.splice(wiederIn, 0, frage);
  naechsteFrage();
}

function timerStoppen() {
  if (timerIntervall) {
    clearInterval(timerIntervall);
    timerIntervall = null;
  }
  const btn = document.getElementById('quiz-timer-btn');
  const disp = document.getElementById('quiz-timer-display');
  btn?.classList.remove('aktiv');
  disp?.classList.add('hidden');
  disp?.classList.remove('warnung');
}

function timerStarten() {
  if (timerIntervall) return; // läuft schon
  timerSekundenRest = TIMER_DAUER;
  const btn = document.getElementById('quiz-timer-btn');
  const disp = document.getElementById('quiz-timer-display');
  btn?.classList.add('aktiv');
  disp?.classList.remove('hidden');
  disp?.classList.remove('warnung');
  timerAktualisieren();
  timerIntervall = setInterval(() => {
    timerSekundenRest--;
    timerAktualisieren();
    if (timerSekundenRest <= 0) {
      timerStoppen();
      zeigeErgebnis();
    } else if (timerSekundenRest <= 300) {
      disp?.classList.add('warnung'); // 5 Min
    }
  }, 1000);
}

function timerAktualisieren() {
  const m = Math.floor(timerSekundenRest / 60);
  const s = timerSekundenRest % 60;
  const disp = document.getElementById('quiz-timer-display');
  if (disp) disp.textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

function zeigeErgebnis() {
  timerStoppen();
  quizBereich.classList.add('hidden');
  ergebnisBereich.classList.remove('hidden');

  const gesamt = pruefungsErgebnis.richtig + pruefungsErgebnis.falsch;
  const prozent = gesamt > 0 ? Math.round((pruefungsErgebnis.richtig / gesamt) * 100) : 0;

  document.getElementById('ergebnis-anzeige').innerHTML = `
    <div class="prozent">${prozent}%</div>
    <div class="text">${pruefungsErgebnis.richtig} von ${gesamt} Multiple-Choice-Fragen richtig</div>
    <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--farbe-text-mild);">
      Karteikarten werden im Prüfungsmodus nicht gewertet.
    </p>
  `;
}
