# Clock & Calendar PWA

This is a minimal Progressive Web App that shows a digital clock and the current month's calendar. It supports selecting a timezone from a short list.

How to test locally

1. Serve the folder with a static server (recommended: `serve` or `http-server`):

   ```bash
   npx serve .
   ```

2. Open `http://localhost:5000` (or the port printed by the server).

3. Use the timezone selector. The choice is stored in localStorage.

Publish to GitHub Pages

- Push this repository to GitHub, enable Pages from the `gh-pages` branch or the `main` branch's `/` root (or setup as you prefer). Make sure the `manifest.json` and `index.html` are at the repo root for Pages to find them.

Notes

- The service worker caches core files for offline use.
- The timezone list is intentionally small; expand `src/main.js` `zones` array to add more.
