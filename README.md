# Load Balance · gebioMized
Kontaktpunkt-Lastverteilung für Triathlon-Bikes – Progressive Web App

## Setup

```bash
npm install
npm run dev        # lokale Entwicklung auf http://localhost:5173
npm run build      # Production-Build → dist/
npm run preview    # Production-Build lokal testen
```

## Deployment (kostenlos, ~2 Minuten)

### Option A – Vercel (empfohlen)
1. Repo auf GitHub pushen
2. https://vercel.com → "New Project" → Repo auswählen
3. Framework: Vite → Deploy
→ Du bekommst eine URL wie `load-balance.vercel.app`

### Option B – Netlify
1. https://netlify.com → "Add new site" → "Deploy manually"
2. `npm run build` ausführen, dann den `dist/`-Ordner hochladen
→ Fertig

## PWA installieren
Nach dem Deployment die URL im Browser öffnen.
- **iPhone/iPad**: Safari → Teilen → „Zum Home-Bildschirm"
- **Android**: Chrome → Menü → „App installieren"  
- **Desktop**: Chrome/Edge zeigt ein Install-Icon in der Adressleiste

Die App funktioniert danach auch **offline**.
