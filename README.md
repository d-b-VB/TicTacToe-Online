# TicTacToe Online (No account needed)

Yes — this works across different machines on GitHub Pages without Firebase or any project setup.

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

Push these static files and enable Pages.

## How to play on two machines

1. Open the site on Host and Guest.
2. Host clicks **Create Offer** and sends the text to Guest.
3. Guest pastes it, clicks **Create Answer**, and sends answer text back.
4. Host pastes answer and clicks **Connect Answer**.
5. Play.

## If you still see "Create Room / Join Room" or Firebase messages

You are on an older deployment. This build should show:
- **Create Offer** / **Create Answer** / **Connect Answer** buttons
- A green badge saying **"Version: WebRTC (no Firebase required)"**

After pushing, do a hard refresh (`Ctrl+Shift+R` or `Cmd+Shift+R`) and verify GitHub Pages is building from the branch/folder where these files were pushed.

## Notes

- This uses a public STUN server only to establish connection.
- In some strict networks, direct peer-to-peer may fail.
