const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.get("/health", (_, res) => res.json({ ok: true }));
// Expose the player names and aliases used by the answer checker for live suggestions.
app.get("/api/players", (_, res) => res.json(PLAYERS.map(p => ({ name: p.name, aliases: p.aliases || [] }))));

const CLUBS = [
  { id:"barca", name:"Barcelona", league:"La Liga", icon:"🔵🔴" },
  { id:"realmadrid", name:"Real Madrid", league:"La Liga", icon:"⚪" },
  { id:"inter", name:"Inter Milan", league:"Serie A", icon:"⚫🔵" },
  { id:"milan", name:"AC Milan", league:"Serie A", icon:"🔴⚫" },
  { id:"juve", name:"Juventus", league:"Serie A", icon:"⚪⚫" },
  { id:"manutd", name:"Manchester United", league:"Premier League", icon:"🔴" },
  { id:"liverpool", name:"Liverpool", league:"Premier League", icon:"🔴" },
  { id:"chelsea", name:"Chelsea", league:"Premier League", icon:"🔵" },
  { id:"arsenal", name:"Arsenal", league:"Premier League", icon:"🔴⚪" },
  { id:"city", name:"Manchester City", league:"Premier League", icon:"🩵" },
  { id:"bayern", name:"Bayern Munich", league:"Bundesliga", icon:"🔴⚪" },
  { id:"dortmund", name:"Borussia Dortmund", league:"Bundesliga", icon:"🟡⚫" },
  { id:"psg", name:"Paris Saint-Germain", league:"Ligue 1", icon:"🔵🔴" },
  { id:"atleti", name:"Atlético Madrid", league:"La Liga", icon:"🔴⚪" },
  { id:"ajax", name:"Ajax", league:"Netherlands / Europe", icon:"⚪🔴" }
];

// Starter set only. Before using for formal competition, review and expand the evidence-backed player database.
const PLAYERS = [
  { name:"Ronaldo Nazário", aliases:["R9","Ronaldo","Ronaldo Nazario"], clubs:["barca","inter","realmadrid","milan"], years:"Barcelona 1996–97; Inter 1997–2002; Real Madrid 2002–07; AC Milan 2007–08", sources:[["Real Madrid official","https://www.realmadrid.com/en-US/the-club/history/football-legends/ronaldo-luis-nazario-de-lima"]] },
  { name:"Luís Figo", aliases:["Luis Figo","Figo"], clubs:["barca","realmadrid","inter"], years:"Barcelona 1995–2000; Real Madrid 2000–05; Inter 2005–09", sources:[["Real Madrid official","https://www.realmadrid.com/en-US/the-club/history/football-legends/luis-figo"],["Inter official archive","https://www.inter.it/en/archivio_giocatore/G0785"]] },
  { name:"Zlatan Ibrahimović", aliases:["Zlatan","Ibrahimovic","Ibra"], clubs:["ajax","juve","inter","barca","milan","manutd","psg"], years:"Ajax, Juventus, Inter, Barcelona, AC Milan, Manchester United, PSG", sources:[["AC Milan official","https://www.acmilan.com/en/club/legends/players/ibrahimovic"]] },
  { name:"Thierry Henry", aliases:["Henry"], clubs:["arsenal","barca","juve"], years:"Juventus 1999; Arsenal 1999–2007 and loan 2012; Barcelona 2007–10", sources:[["Arsenal official","https://www.arsenal.com/historic/players/thierry-henry"]] },
  { name:"Cristiano Ronaldo", aliases:["CR7","Cristiano"], clubs:["manutd","realmadrid","juve"], years:"Manchester United 2003–09 and 2021–22; Real Madrid 2009–18; Juventus 2018–21", sources:[["Real Madrid official","https://www.realmadrid.com/en-US/the-club/history/football-legends/cristiano-ronaldo"]] },
  { name:"Arjen Robben", aliases:["Robben"], clubs:["chelsea","realmadrid","bayern"], years:"Chelsea 2004–07; Real Madrid 2007–09; Bayern 2009–19", sources:[["Bayern official","https://fcbayern.com/en/club/hall-of-fame/arjen-robben"]] },
  { name:"Philippe Coutinho", aliases:["Coutinho"], clubs:["liverpool","barca","bayern"], years:"Liverpool 2013–18; Barcelona 2018–22; Bayern loan 2019–20", sources:[["FC Barcelona official","https://www.fcbarcelona.com/en/football/first-team/players"]] },
  { name:"James Rodríguez", aliases:["James Rodriguez","James"], clubs:["realmadrid","bayern"], years:"Real Madrid 2014–17 and 2019–20; Bayern loan 2017–19", sources:[["Real Madrid official","https://www.realmadrid.com/en-US/the-club/history/football-legends/james-rodriguez"]] },
  { name:"Robert Lewandowski", aliases:["Lewandowski","Lewa"], clubs:["dortmund","bayern","barca"], years:"Dortmund 2010–14; Bayern 2014–22; Barcelona 2022–", sources:[["FC Barcelona official","https://www.fcbarcelona.com/en/football/first-team/players"]] },
  { name:"Cesc Fàbregas", aliases:["Cesc Fabregas","Fabregas","Cesc"], clubs:["arsenal","barca","chelsea"], years:"Arsenal 2003–11; Barcelona 2011–14; Chelsea 2014–19", sources:[["Arsenal official","https://www.arsenal.com/historic/players/cesc-fabregas"]] },
  { name:"Kevin De Bruyne", aliases:["De Bruyne","KDB"], clubs:["chelsea","city"], years:"Chelsea 2013–14; Manchester City 2015–25", sources:[["Manchester City official","https://www.mancity.com/players/kevin-de-bruyne"]] },
  { name:"Eden Hazard", aliases:["Hazard"], clubs:["chelsea","realmadrid"], years:"Chelsea 2012–19; Real Madrid 2019–23", sources:[["Real Madrid official","https://www.realmadrid.com/"]] },
  { name:"Zinédine Zidane", aliases:["Zinedine Zidane","Zidane"], clubs:["juve","realmadrid"], years:"Juventus 1996–2001; Real Madrid 2001–06", sources:[["Real Madrid official","https://www.realmadrid.com/en-US/the-club/history/football-legends/zinedine-zidane"]] },
  { name:"Andrea Pirlo", aliases:["Pirlo"], clubs:["inter","milan","juve"], years:"Inter 1998–2001; AC Milan 2001–11; Juventus 2011–15", sources:[["Juventus official","https://www.juventus.com/"]] }
];

const rooms = new Map();
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
function playerMatch(answer) {
  const a = norm(answer);
  if (!a) return null;
  return PLAYERS.find(p => [p.name, ...(p.aliases || [])].some(n => norm(n) === a)) || null;
}
function randomTriple() {
  const list = [...CLUBS];
  for (let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}
  return list.slice(0,3).map(c=>c.id);
}
function publicRoom(room) {
  const triple = room.clubs.map(id => CLUBS.find(c=>c.id===id));
  return { code:room.code, hostId:room.hostId, clubs:triple, round:room.round,
    status:room.status, players:[...room.players.values()].map(p=>({id:p.id,nickname:p.nickname,score:p.score,submitted:!!p.submitted})),
    answers: room.status === "revealed" ? room.answers : [] };
}
function emitRoom(room) { io.to(room.code).emit("room:update", publicRoom(room)); }
function makeCode(){ return crypto.randomBytes(3).toString("hex").toUpperCase(); }

io.on("connection", socket => {
  socket.on("room:create", ({nickname}, cb) => {
    nickname = String(nickname||"").trim().slice(0,20);
    if(!nickname) return cb?.({error:"กรุณาใส่ชื่อเล่น"});
    let code; do{code=makeCode()}while(rooms.has(code));
    const player = {id:socket.id,nickname,score:0,submitted:null};
    const room = {code,hostId:socket.id,players:new Map([[socket.id,player]]),clubs:randomTriple(),round:1,status:"playing",answers:[]};
    rooms.set(code,room); socket.join(code); socket.data.room=code;
    cb?.({room:publicRoom(room)}); emitRoom(room);
  });
  socket.on("room:join", ({code,nickname}, cb) => {
    code=String(code||"").trim().toUpperCase(); nickname=String(nickname||"").trim().slice(0,20);
    const room=rooms.get(code);
    if(!nickname) return cb?.({error:"กรุณาใส่ชื่อเล่น"});
    if(!room) return cb?.({error:"ไม่พบห้องนี้ ตรวจรหัสแล้วลองใหม่"});
    if(room.status==="revealed") return cb?.({error:"รอบนี้เฉลยแล้ว ให้เจ้าของห้องเริ่มรอบใหม่ก่อน"});
    if([...room.players.values()].some(p=>p.nickname.toLowerCase()===nickname.toLowerCase())) return cb?.({error:"ชื่อนี้มีคนใช้ในห้องแล้ว"});
    const player={id:socket.id,nickname,score:0,submitted:null};
    room.players.set(socket.id,player); socket.join(code); socket.data.room=code;
    cb?.({room:publicRoom(room)}); emitRoom(room);
  });
  socket.on("answer:submit", ({answer}, cb) => {
    const room=rooms.get(socket.data.room); if(!room) return cb?.({error:"ไม่พบห้อง"});
    if(room.status!=="playing") return cb?.({error:"รอบนี้เฉลยแล้ว"});
    const p=room.players.get(socket.id); if(!p) return cb?.({error:"ไม่พบผู้เล่น"});
    answer=String(answer||"").trim().slice(0,80); if(!answer) return cb?.({error:"กรุณาพิมพ์คำตอบ"});
    p.submitted=answer; emitRoom(room); cb?.({ok:true});
  });
  socket.on("round:reveal", (_, cb) => {
    const room=rooms.get(socket.data.room); if(!room) return cb?.({error:"ไม่พบห้อง"});
    if(room.hostId!==socket.id) return cb?.({error:"เฉพาะเจ้าของห้องเท่านั้น"});
    if(room.status!=="playing") return cb?.({error:"เฉลยไปแล้ว"});
    const triple=room.clubs;
    room.answers=[];
    for(const p of room.players.values()){
      const found=playerMatch(p.submitted);
      const matched=found ? found.clubs.filter(id=>triple.includes(id)) : [];
      const pts=matched.length;
      p.score += pts;
      room.answers.push({playerId:p.id,nickname:p.nickname,submitted:p.submitted||"",matched:found?found.name:null,points:pts,clubs:matched.map(id=>CLUBS.find(c=>c.id===id).name),years:found?.years||null,sources:found?.sources||[],unknown:!!p.submitted&&!found});
    }
    room.status="revealed"; emitRoom(room); cb?.({ok:true});
  });
  socket.on("round:next", (_, cb) => {
    const room=rooms.get(socket.data.room); if(!room) return cb?.({error:"ไม่พบห้อง"});
    if(room.hostId!==socket.id) return cb?.({error:"เฉพาะเจ้าของห้องเท่านั้น"});
    if(room.status!=="revealed") return cb?.({error:"ต้องเฉลยรอบนี้ก่อน"});
    room.clubs=randomTriple(); room.round++; room.status="playing"; room.answers=[];
    for(const p of room.players.values()) p.submitted=null;
    emitRoom(room); cb?.({ok:true});
  });
  socket.on("room:reset", (_, cb) => {
    const room=rooms.get(socket.data.room); if(!room) return cb?.({error:"ไม่พบห้อง"});
    if(room.hostId!==socket.id) return cb?.({error:"เฉพาะเจ้าของห้องเท่านั้น"});
    for(const p of room.players.values()){p.score=0;p.submitted=null;}
    room.clubs=randomTriple();room.round=1;room.status="playing";room.answers=[];emitRoom(room);cb?.({ok:true});
  });
  socket.on("disconnect", () => {
    const code=socket.data.room, room=rooms.get(code); if(!room)return;
    room.players.delete(socket.id);
    if(room.players.size===0){rooms.delete(code);return;}
    if(room.hostId===socket.id) room.hostId=room.players.keys().next().value;
    emitRoom(room);
  });
});
server.listen(PORT,()=>console.log(`3 Clubs Quiz listening on port ${PORT}`));
