# TicTacToe Online (No account needed)

Yes — this can work across different machines on GitHub Pages without Firebase or any project setup.

This version uses **WebRTC data channels** and a one-time **manual copy/paste handshake**:
- Host creates an offer and sends it to Guest.
- Guest creates an answer and sends it back.
- After that, moves sync live peer-to-peer.

## Run locally

```bash
python3 -m http.server 4173
# open http://localhost:4173
```

## Deploy on GitHub Pages

Just push these static files to your repo and enable Pages. No backend service or account setup is required.

## How to play on two machines

1. Open the site on Host and Guest.
2. Host clicks **Create Offer** and sends the text to Guest.
3. Guest pastes it, clicks **Create Answer**, and sends answer text back.
4. Host pastes answer and clicks **Connect Answer**.
5. Play.

## Notes

- This uses a public STUN server only to establish connection.
- In some strict networks, direct peer-to-peer may fail.
