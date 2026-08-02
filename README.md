# Focus — Study Timer

A small, local-first study companion: Pomodoro-style timer, task list, and customizable cover image saved to your browser.

How to use

1. Open `Main.html` in your browser (double-click the file or serve it from a local server).
2. Pick a session length from the dropdown, then press Start. Use Pause and Reset as needed.
3. Add tasks in the Tasks panel. Tasks are saved in localStorage.
4. Click "Change cover" to upload an image for the header; the image is stored in localStorage and persists locally.
5. Allow notifications when prompted to get a desktop notice when a session ends.

Files

- `Main.html` — the page
- `styles.css` — styles and responsive layout
- `Main.js` — timer, task list, cover image code

Server-backed cover image

If you want the cover image to be served from a backend so other devices or users can change it, a simple Node.js server is included.

Run the server (requires Node.js):

1. Open a terminal in the project folder (`c:\Focus website`).
2. Install dependencies once: `npm install`.
3. Start the server: `npm start`.
4. Open http://localhost:3000/Main.html in your browser.

The UI will upload an image to `/upload` and the server serves it at `/cover`.

Notes

- Everything is client-side and stored in your browser; no server required.
- If you want to reset everything, clear the site data for the file in your browser or open DevTools -> Application -> Clear Storage.
