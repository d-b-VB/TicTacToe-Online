# TicTacToe Online (GitHub Pages + Firebase)

Yes — this can be done on `https://d-b-vb.github.io/tictactoe-online/`.

This repo now contains a static front end that works on GitHub Pages and synchronizes moves through Firebase Realtime Database, so two players on different machines can join the same room code and play live.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Enable online play

1. Create a Firebase project and Realtime Database.
2. Copy `config.example.js` to `config.js`.
3. Fill in `window.FIREBASE_CONFIG` in `config.js`.
4. Deploy to GitHub Pages.

## Notes

- Firebase API keys are intended to be public in browser apps.
- Add Firebase Realtime Database security rules before production use.
