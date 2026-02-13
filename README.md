# Quiz-Schatz

Prüfungsvorbereitung für die Weiterbildung Praxisanleitung M II.

## Starten

Die App muss über einen lokalen Webserver laufen (z.B. wegen `fetch` für `fragen.json`).

**Option 1 – mit Node.js:**
```bash
npx serve .
```

**Option 2 – mit Python:**
```bash
python -m http.server 8000
```

Dann im Browser öffnen: `http://localhost:3000` (serve) oder `http://localhost:8000` (Python).

## PWA nutzen

1. Im Browser die App öffnen
2. Auf dem iPhone: Safari → Teilen → „Zum Home-Bildschirm“
3. Die App lässt sich dann wie eine native App starten und offline nutzen

## Inhalt

- **Wissenschaftliches Arbeiten:** 11 Karteikarten
- **Kommunikation (Vier-Ohren-Modell):** 10 Multiple-Choice-Fragen

## Modi

- **Lernmodus:** Themen in Ruhe durchgehen
- **Prüfungsmodus:** 20 zufällige Fragen aus allen Themen (Prüfungssimulation)

---

## GitHub Pages – kostenlos hosten

### 1. GitHub-Konto & Repository

1. Gehe zu [github.com](https://github.com) und melde dich an (oder erstelle ein Konto).
2. Klicke auf **„+“** → **„New repository“**.
3. Name: z.B. **`quiz-schatz`**
4. **Public** auswählen, **„Create repository“** klicken.

### 2. Code hochladen

**Option A – mit Git (empfohlen):**

```bash
cd c:\Users\user\Desktop\quiz_schatz
git init
git add .
git commit -m "Quiz-Schatz initial"
git branch -M main
git remote add origin https://github.com/Thomas1199/Anleitungsquiz.git
git push -u origin main
```

Ersetze `DEIN-USERNAME` durch deinen GitHub-Benutzernamen.

**Option B – per Drag & Drop:**

1. Auf der leeren Repository-Seite auf **„uploading an existing file“** klicken.
2. Alle Dateien aus dem Ordner `quiz_schatz` hineinziehen (außer `memory-bank` wenn du willst – optional).
3. **„Commit changes“** klicken.

### 3. GitHub Pages aktivieren

1. Im Repository: **Settings** (Einstellungen).
2. Links: **Pages**.
3. Unter **Source:** **Deploy from a branch** wählen.
4. **Branch:** `main`, **Folder:** `/ (root)`.
5. **Save** klicken.

### 4. Fertig

Nach 1–2 Minuten ist die App erreichbar unter:

**`https://Thomas1199.github.io/Anleitungsquiz/`**
