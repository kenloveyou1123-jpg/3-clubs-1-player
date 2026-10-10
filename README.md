# 3 สโมสร 1 นักฟุตบอล — Online prototype

## Features
- Create a room and share a short room code.
- Friends join from their own devices with nicknames.
- Random three clubs, submit answers, reveal answers, and score in real time.
- Room owner can reveal, move to the next round, or reset scores.

## Run locally
Requires Node.js 18 or newer.

```bash
npm install
npm start
```
Open http://localhost:3000

For friends on the same Wi-Fi, find your computer's LAN IP and let them open `http://YOUR-LAN-IP:3000`.
For friends outside your home, deploy this project to a Node.js hosting service that supports WebSockets (for example Render, Railway, or a VPS). The source files are provided, but this package is not hosted online yet.

## Important data note
The included player list is only a starter database and is not exhaustive. The app uses exact normalized name/alias matching; if a name is unknown, it labels it for manual review rather than claiming the answer is wrong. Verify player appearances and loan spells against reliable club/league sources before using it for official competition.
