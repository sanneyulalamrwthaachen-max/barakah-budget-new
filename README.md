# Barakah Budget

Live: https://barakah-budget-1.vercel.app

A personal finance app for a student abroad: monthly budget, debt, money sent
home, zakat, and halal finance news. It runs as an installable web app and
stores everything in your own Google Sheet.

## Files

| File | What it is |
|---|---|
| `index.html` | the page structure |
| `styles.css` | all the styling, light and dark |
| `app.js` | all the logic: budget, currencies, debts, zakat, sync |
| `sw.js` | makes the app work offline. Change `VERSION` after any edit |
| `manifest.webmanifest` | lets Android install it as a real app |
| `vercel.json` | caching and privacy headers |
| `finance-sheets-script.gs` | paste this into script.google.com |
| `icon-*.png` | the app icon |

## Running it on your computer

It is plain HTML, CSS and JavaScript. No build step. But `file://` will not
work, because the app fetches `finance-sheets-script.gs`. Start a tiny server
in this folder instead:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Deploying

Vercel is connected to this repository, so every push to `main` deploys.

```bash
git add -A
git commit -m "what you changed"
git push
```

**After changing `index.html`, `styles.css` or `app.js`, bump `VERSION` in
`sw.js`** (for example `bb-v3` to `bb-v4`). Phones cache the old files
otherwise, and your change will not appear.

## Connecting the Google Sheet

Open the app, go to Settings, and follow the guide under "How to connect
Google Sheets". The short version:

1. Paste `finance-sheets-script.gs` into a new project at script.google.com
2. Change the `SECRET` line to your own long secret word
3. Deploy as a Web app, **Execute as: Me**, **Who has access: Anyone**
4. Put the `/exec` URL and your secret word into the app's Settings

"Anyone" is required because a browser cannot get past a Google login screen.
The secret word is what protects the data. Never share the URL or the word.
