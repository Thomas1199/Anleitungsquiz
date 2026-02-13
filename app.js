/**
 * Quiz-Schatz – Prüfungsvorbereitung Praxisanleitung M II
 * Lernmodus & Prüfungsmodus
 */

let fragenDaten = null;
let aktuelleKategorie = null;
let aktuelleFragen = [];
let aktuelleIndex = 0;
let modus = 'lernen'; // 'lernen' | 'pruefung'
let pruefungsErgebnis = { richtig: 0, falsch: 0 };
const PRUEFUNG_ANZAHL = 20; // Anzahl Fragen in der Prüfungssimulation (wie in der echten Prüfung)

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

// Init
document.addEventListener('DOMContentLoaded', async () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
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

  document.getElementById('btn-gewusst').addEventListener('click', naechsteFrage);
  document.getElementById('btn-nicht-gewusst').addEventListener('click', naechsteFrage);

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
  aktuelleKategorie = kategorie;
  if (modus === 'pruefung' && kategorie.id === 'alle') {
    // Prüfungssimulation: 20 zufällige Fragen, gemischt aus allen 11 Themenbereichen
    aktuelleFragen = mischePruefungsfragen(PRUEFUNG_ANZAHL);
  } else if (modus === 'pruefung') {
    aktuelleFragen = [...kategorie.fragen].sort(() => Math.random() - 0.5);
  } else {
    aktuelleFragen = kategorie.fragen;
  }
  aktuelleIndex = 0;
  pruefungsErgebnis = { richtig: 0, falsch: 0 };

  kategorieAuswahl.classList.add('hidden');
  quizBereich.classList.remove('hidden');

  frageAnzeigen();
}

/** Zieht PRUEFUNG_ANZAHL Fragen aus allen Kategorien – mind. 1 pro Thema, Rest zufällig. */
function mischePruefungsfragen(anzahl) {
  const kategorien = fragenDaten.kategorien;
  const ergebnis = [];
  const proKategorie = kategorien.map(k => [...k.fragen].sort(() => Math.random() - 0.5));

  // Mindestens 1 Frage pro Thema (wenn vorhanden)
  proKategorie.forEach((fragen, i) => {
    if (fragen.length > 0 && ergebnis.length < anzahl) {
      ergebnis.push({ frage: fragen.shift(), kategorie: kategorien[i] });
    }
  });

  // Restliche Fragen aus allen Themen zufällig ziehen
  const alleUebrig = proKategorie.flatMap((fragen, i) =>
    fragen.map(f => ({ frage: f, kategorie: kategorien[i] }))
  ).sort(() => Math.random() - 0.5);

  for (const item of alleUebrig) {
    if (ergebnis.length >= anzahl) break;
    ergebnis.push(item);
  }

  return ergebnis.sort(() => Math.random() - 0.5).map(item => item.frage);
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

  // Prüfungsstand (nur im Prüfungsmodus)
  const pruefungsStand = document.getElementById('quiz-pruefungs-stand');
  if (modus === 'pruefung') {
    const mcAnzahl = aktuelleFragen.filter(f => f.typ === 'multipleChoice').length;
    pruefungsStand.classList.remove('hidden');
    pruefungsStand.textContent = `${pruefungsErgebnis.richtig} von ${mcAnzahl} richtig`;
  } else {
    pruefungsStand.classList.add('hidden');
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

function zeigeErgebnis() {
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
