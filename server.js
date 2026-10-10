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
  { name:"Andrea Pirlo", aliases:["Pirlo"], clubs:["inter","milan","juve"], years:"Inter 1998–2001; AC Milan 2001–11; Juventus 2011–15", sources:[["Juventus official","https://www.juventus.com/"]] },

  // Expanded curated set of well-known players across the supported clubs.
  { name:"Lionel Messi", aliases:["Messi","Leo Messi","La Pulga"], clubs:["barca"], years:"Barcelona 2004–21" },
  { name:"Xavi Hernández", aliases:["Xavi","Xavi Hernandez"], clubs:["barca"], years:"Barcelona 1998–2015" },
  { name:"Andrés Iniesta", aliases:["Andres Iniesta","Iniesta"], clubs:["barca"], years:"Barcelona 2002–18" },
  { name:"Sergio Busquets", aliases:["Busquets","Busi"], clubs:["barca"], years:"Barcelona 2008–23" },
  { name:"Carles Puyol", aliases:["Puyol"], clubs:["barca"], years:"Barcelona 1999–2014" },
  { name:"Gerard Piqué", aliases:["Gerard Pique","Pique"], clubs:["barca","manutd"], years:"Manchester United 2004–08; Barcelona 2008–22" },
  { name:"Ronaldinho", aliases:["Ronaldinho Gaucho","Dinho"], clubs:["barca","milan"], years:"Barcelona 2003–08; AC Milan 2008–11" },
  { name:"Samuel Eto'o", aliases:["Samuel Eto","Eto'o","Etoo"], clubs:["barca","inter","chelsea"], years:"Barcelona 2004–09; Inter 2009–11; Chelsea 2013–14" },
  { name:"David Villa", aliases:["Villa"], clubs:["barca","atleti"], years:"Barcelona 2010–13; Atlético Madrid 2013–14" },
  { name:"Neymar Jr.", aliases:["Neymar","Neymar Junior"], clubs:["barca","psg"], years:"Barcelona 2013–17; PSG 2017–23" },
  { name:"Luis Suárez", aliases:["Luis Suarez","Suarez","Lucho"], clubs:["barca","atleti","liverpool"], years:"Liverpool 2011–14; Barcelona 2014–20; Atlético Madrid 2020–22" },
  { name:"Antoine Griezmann", aliases:["Griezmann"], clubs:["barca","atleti"], years:"Barcelona 2019–22; Atlético Madrid 2014–19 and 2021–" },
  { name:"Sergio Ramos", aliases:["Ramos"], clubs:["realmadrid","psg"], years:"Real Madrid 2005–21; PSG 2021–23" },
  { name:"Karim Benzema", aliases:["Benzema","Big Benz"], clubs:["realmadrid"], years:"Real Madrid 2009–23" },
  { name:"Luka Modrić", aliases:["Luka Modric","Modric"], clubs:["realmadrid"], years:"Real Madrid 2012–25" },
  { name:"Toni Kroos", aliases:["Kroos"], clubs:["realmadrid","bayern"], years:"Bayern Munich 2007–14; Real Madrid 2014–24" },
  { name:"Marcelo", aliases:["Marcelo Vieira"], clubs:["realmadrid"], years:"Real Madrid 2007–22" },
  { name:"Iker Casillas", aliases:["Casillas","San Iker"], clubs:["realmadrid"], years:"Real Madrid 1999–2015" },
  { name:"Raúl González", aliases:["Raul Gonzalez","Raul"], clubs:["realmadrid"], years:"Real Madrid 1994–2010" },
  { name:"Roberto Carlos", aliases:["RC3"], clubs:["realmadrid","inter"], years:"Inter 1995–96; Real Madrid 1996–2007" },
  { name:"David Beckham", aliases:["Beckham"], clubs:["realmadrid","manutd","milan"], years:"Manchester United 1993–2003; Real Madrid 2003–07; AC Milan loans 2009 and 2010" },
  { name:"Gareth Bale", aliases:["Bale"], clubs:["realmadrid"], years:"Real Madrid 2013–22" },
  { name:"Vinícius Júnior", aliases:["Vinicius Junior","Vini Jr","Vini"], clubs:["realmadrid"], years:"Real Madrid 2018–" },
  { name:"Jude Bellingham", aliases:["Bellingham","Jude"], clubs:["realmadrid","dortmund"], years:"Borussia Dortmund 2020–23; Real Madrid 2023–" },
  { name:"Kaká", aliases:["Kaka","Ricardo Kaka"], clubs:["milan","realmadrid"], years:"AC Milan 2003–09 and 2013–14; Real Madrid 2009–13" },
  { name:"Paolo Maldini", aliases:["Maldini"], clubs:["milan"], years:"AC Milan 1984–2009" },
  { name:"Kaká", aliases:["Kaka"], clubs:["milan","realmadrid"], years:"AC Milan and Real Madrid" },
  { name:"Andriy Shevchenko", aliases:["Shevchenko","Sheva"], clubs:["milan","chelsea"], years:"AC Milan 1999–2006 and 2008–09; Chelsea 2006–08" },
  { name:"Clarence Seedorf", aliases:["Seedorf"], clubs:["milan","realmadrid","inter","ajax"], years:"Ajax, Real Madrid, Inter and AC Milan" },
  { name:"Kakha Kaladze", aliases:["Kaladze"], clubs:["milan"], years:"AC Milan 2001–10" },
  { name:"Filippo Inzaghi", aliases:["Inzaghi","Pippo"], clubs:["milan","juve"], years:"Juventus 1997–2001; AC Milan 2001–12" },
  { name:"Gennaro Gattuso", aliases:["Gattuso","Rino"], clubs:["milan"], years:"AC Milan 1999–2012" },
  { name:"Thiago Silva", aliases:["Silva","Thiago"], clubs:["milan","psg","chelsea"], years:"AC Milan 2009–12; PSG 2012–20; Chelsea 2020–24" },
  { name:"Rivaldo", aliases:["Rivaldo Vítor"], clubs:["barca","milan"], years:"Barcelona 1997–2002; AC Milan 2002–03" },
  { name:"Zlatan Ibrahimović", aliases:["Ibra","Zlatan"], clubs:["ajax","juve","inter","barca","milan","manutd","psg"], years:"Ajax, Juventus, Inter, Barcelona, AC Milan, Manchester United and PSG" },
  { name:"Wayne Rooney", aliases:["Rooney","Wazza"], clubs:["manutd"], years:"Manchester United 2004–17" },
  { name:"Ryan Giggs", aliases:["Giggs"], clubs:["manutd"], years:"Manchester United 1990–2014" },
  { name:"Paul Scholes", aliases:["Scholes"], clubs:["manutd"], years:"Manchester United 1993–2013" },
  { name:"Eric Cantona", aliases:["Cantona"], clubs:["manutd"], years:"Manchester United 1992–97" },
  { name:"Roy Keane", aliases:["Keane"], clubs:["manutd"], years:"Manchester United 1993–2005" },
  { name:"Rio Ferdinand", aliases:["Ferdinand","Rio"], clubs:["manutd"], years:"Manchester United 2002–14" },
  { name:"Nemanja Vidić", aliases:["Nemanja Vidic","Vidic"], clubs:["manutd"], years:"Manchester United 2006–14" },
  { name:"Robin van Persie", aliases:["Van Persie","RVP"], clubs:["manutd","arsenal"], years:"Arsenal 2004–12; Manchester United 2012–15" },
  { name:"Patrice Evra", aliases:["Evra"], clubs:["manutd","juve"], years:"Manchester United 2006–14; Juventus 2014–17" },
  { name:"David de Gea", aliases:["De Gea","DDG"], clubs:["manutd"], years:"Manchester United 2011–23" },
  { name:"Marcus Rashford", aliases:["Rashford"], clubs:["manutd"], years:"Manchester United 2016–" },
  { name:"Mohamed Salah", aliases:["Salah","Mo Salah"], clubs:["liverpool","chelsea"], years:"Chelsea 2013–15; Liverpool 2017–" },
  { name:"Steven Gerrard", aliases:["Gerrard","Stevie G"], clubs:["liverpool"], years:"Liverpool 1998–2015" },
  { name:"Jamie Carragher", aliases:["Carragher","Carra"], clubs:["liverpool"], years:"Liverpool 1996–2013" },
  { name:"Fernando Torres", aliases:["Torres","El Niño","El Nino"], clubs:["liverpool","chelsea","atleti"], years:"Liverpool 2007–11; Chelsea 2011–15; Atlético Madrid spells" },
  { name:"Sadio Mané", aliases:["Sadio Mane","Mane"], clubs:["liverpool","bayern"], years:"Liverpool 2016–22; Bayern Munich 2022–23" },
  { name:"Roberto Firmino", aliases:["Firmino","Bobby"], clubs:["liverpool"], years:"Liverpool 2015–23" },
  { name:"Virgil van Dijk", aliases:["Van Dijk","VVD"], clubs:["liverpool"], years:"Liverpool 2018–" },
  { name:"Alisson Becker", aliases:["Alisson"], clubs:["liverpool"], years:"Liverpool 2018–" },
  { name:"Luis Díaz", aliases:["Luis Diaz","Lucho Diaz"], clubs:["liverpool"], years:"Liverpool 2022–" },
  { name:"Frank Lampard", aliases:["Lampard","Super Frank"], clubs:["chelsea","city"], years:"Chelsea 2001–14; Manchester City 2014–15" },
  { name:"Didier Drogba", aliases:["Drogba"], clubs:["chelsea"], years:"Chelsea 2004–12 and 2014–15" },
  { name:"John Terry", aliases:["Terry","JT"], clubs:["chelsea"], years:"Chelsea 1998–2017" },
  { name:"Petr Čech", aliases:["Petr Cech","Cech"], clubs:["chelsea","arsenal"], years:"Chelsea 2004–15; Arsenal 2015–19" },
  { name:"Eden Hazard", aliases:["Hazard"], clubs:["chelsea","realmadrid"], years:"Chelsea 2012–19; Real Madrid 2019–23" },
  { name:"N'Golo Kanté", aliases:["N'Golo Kante","Kante"], clubs:["chelsea"], years:"Chelsea 2016–23" },
  { name:"César Azpilicueta", aliases:["Cesar Azpilicueta","Azpilicueta","Dave"], clubs:["chelsea","atleti"], years:"Chelsea 2012–23; Atlético Madrid 2023–24" },
  { name:"Cesc Fàbregas", aliases:["Fabregas","Cesc"], clubs:["arsenal","barca","chelsea"], years:"Arsenal, Barcelona and Chelsea" },
  { name:"Patrick Vieira", aliases:["Vieira"], clubs:["arsenal","inter"], years:"Arsenal 1996–2005; Inter 2006–07" },
  { name:"Dennis Bergkamp", aliases:["Bergkamp"], clubs:["arsenal","inter"], years:"Inter 1993–95; Arsenal 1995–2006" },
  { name:"Ian Wright", aliases:["Wright"], clubs:["arsenal"], years:"Arsenal 1991–98" },
  { name:"Tony Adams", aliases:["Adams"], clubs:["arsenal"], years:"Arsenal 1983–2002" },
  { name:"Robert Pires", aliases:["Pires"], clubs:["arsenal"], years:"Arsenal 2000–06" },
  { name:"Robin van Persie", aliases:["RVP","Van Persie"], clubs:["arsenal","manutd"], years:"Arsenal 2004–12; Manchester United 2012–15" },
  { name:"Bukayo Saka", aliases:["Saka"], clubs:["arsenal"], years:"Arsenal 2018–" },
  { name:"Sergio Agüero", aliases:["Sergio Aguero","Aguero","Kun"], clubs:["city","atleti"], years:"Atlético Madrid 2006–11; Manchester City 2011–21" },
  { name:"Vincent Kompany", aliases:["Kompany"], clubs:["city"], years:"Manchester City 2008–19" },
  { name:"David Silva", aliases:["Silva","El Mago"], clubs:["city"], years:"Manchester City 2010–20" },
  { name:"Yaya Touré", aliases:["Yaya Toure","Yaya"], clubs:["city","barca"], years:"Barcelona 2007–10; Manchester City 2010–15" },
  { name:"Raheem Sterling", aliases:["Sterling"], clubs:["city","chelsea","liverpool"], years:"Liverpool 2011–15; Manchester City 2015–22; Chelsea 2022–" },
  { name:"Riyad Mahrez", aliases:["Mahrez"], clubs:["city"], years:"Manchester City 2018–23" },
  { name:"İlkay Gündoğan", aliases:["Ilkay Gundogan","Gundogan"], clubs:["city","barca"], years:"Manchester City 2016–23 and 2024–; Barcelona 2023–24" },
  { name:"Erling Haaland", aliases:["Haaland"], clubs:["city","dortmund"], years:"Borussia Dortmund 2020–22; Manchester City 2022–" },
  { name:"Phil Foden", aliases:["Foden"], clubs:["city"], years:"Manchester City 2017–" },
  { name:"Manuel Neuer", aliases:["Neuer"], clubs:["bayern"], years:"Bayern Munich 2011–" },
  { name:"Thomas Müller", aliases:["Thomas Muller","Muller"], clubs:["bayern"], years:"Bayern Munich 2008–" },
  { name:"Philipp Lahm", aliases:["Lahm"], clubs:["bayern"], years:"Bayern Munich 2002–17" },
  { name:"Bastian Schweinsteiger", aliases:["Schweinsteiger","Basti"], clubs:["bayern","manutd"], years:"Bayern Munich 2002–15; Manchester United 2015–17" },
  { name:"Franck Ribéry", aliases:["Franck Ribery","Ribery"], clubs:["bayern"], years:"Bayern Munich 2007–19" },
  { name:"Miroslav Klose", aliases:["Klose"], clubs:["bayern"], years:"Bayern Munich 2007–11" },
  { name:"Arjen Robben", aliases:["Robben"], clubs:["chelsea","realmadrid","bayern"], years:"Chelsea, Real Madrid and Bayern Munich" },
  { name:"Mario Götze", aliases:["Mario Gotze","Gotze"], clubs:["dortmund","bayern"], years:"Borussia Dortmund and Bayern Munich" },
  { name:"Marco Reus", aliases:["Reus"], clubs:["dortmund"], years:"Borussia Dortmund 2012–24" },
  { name:"Mats Hummels", aliases:["Hummels"], clubs:["dortmund","bayern"], years:"Bayern Munich 2007–08 and 2016–19; Dortmund 2008–16 and 2019–24" },
  { name:"Robert Lewandowski", aliases:["Lewandowski","Lewa"], clubs:["dortmund","bayern","barca"], years:"Dortmund, Bayern Munich and Barcelona" },
  { name:"Jadon Sancho", aliases:["Sancho"], clubs:["dortmund","manutd","chelsea"], years:"Dortmund; Manchester United; Chelsea loan" },
  { name:"Marco Verratti", aliases:["Verratti"], clubs:["psg"], years:"PSG 2012–23" },
  { name:"Edinson Cavani", aliases:["Cavani","El Matador"], clubs:["psg","manutd"], years:"PSG 2013–20; Manchester United 2020–22" },
  { name:"Ángel Di María", aliases:["Angel Di Maria","Di Maria"], clubs:["psg","realmadrid","manutd"], years:"Real Madrid 2010–14; Manchester United 2014–15; PSG 2015–20" },
  { name:"Kylian Mbappé", aliases:["Kylian Mbappe","Mbappe","Donatello"], clubs:["psg","realmadrid"], years:"PSG 2017–24; Real Madrid 2024–" },
  { name:"Thiago Motta", aliases:["Motta"], clubs:["barca","inter","psg"], years:"Barcelona, Inter and PSG" },
  { name:"George Weah", aliases:["Weah"], clubs:["milan","psg"], years:"PSG 1992–95; AC Milan 1995–2000" },
  { name:"Rui Costa", aliases:["Rui Costa"], clubs:["milan"], years:"AC Milan 2001–06" },
  { name:"Andrea Barzagli", aliases:["Barzagli"], clubs:["juve"], years:"Juventus 2011–19" },
  { name:"Gianluigi Buffon", aliases:["Buffon","Gigi"], clubs:["juve"], years:"Juventus 2001–18 and 2019–21" },
  { name:"Giorgio Chiellini", aliases:["Chiellini"], clubs:["juve"], years:"Juventus 2005–22" },
  { name:"Leonardo Bonucci", aliases:["Bonucci"], clubs:["juve","milan"], years:"Juventus; AC Milan 2017–18" },
  { name:"Alessandro Del Piero", aliases:["Del Piero","Pinturicchio"], clubs:["juve"], years:"Juventus 1993–2012" },
  { name:"Pavel Nedvěd", aliases:["Pavel Nedved","Nedved"], clubs:["juve"], years:"Juventus 2001–09" },
  { name:"Arturo Vidal", aliases:["Vidal","King Arturo"], clubs:["juve","barca","inter"], years:"Juventus, Barcelona and Inter" },
  { name:"Paul Pogba", aliases:["Pogba"], clubs:["juve","manutd"], years:"Manchester United 2011–12 and 2016–22; Juventus spells" },
  { name:"Carlos Tévez", aliases:["Carlos Tevez","Tevez","Carlitos"], clubs:["juve","manutd","city"], years:"Manchester United, Manchester City and Juventus" },
  { name:"Gonzalo Higuaín", aliases:["Gonzalo Higuain","Higuain"], clubs:["juve","milan"], years:"Juventus; AC Milan loan 2018–19" },
  { name:"Wesley Sneijder", aliases:["Sneijder"], clubs:["inter","ajax","realmadrid"], years:"Ajax, Real Madrid and Inter" },
  { name:"Javier Zanetti", aliases:["Zanetti","Pupi"], clubs:["inter"], years:"Inter 1995–2014" },
  { name:"Diego Milito", aliases:["Milito"], clubs:["inter"], years:"Inter 2009–14" },
  { name:"Esteban Cambiasso", aliases:["Cambiasso"], clubs:["inter","realmadrid"], years:"Real Madrid 2002–04; Inter 2004–14" },
  { name:"Adriano", aliases:["Imperatore"], clubs:["inter"], years:"Inter multiple spells 2001–09" },
  { name:"Ronaldo Nazário", aliases:["Ronaldo R9","R9","Ronaldo Nazario"], clubs:["barca","inter","realmadrid","milan"], years:"Barcelona, Inter, Real Madrid and AC Milan" },
  { name:"Henrik Larsson", aliases:["Larsson"], clubs:["barca","manutd"], years:"Barcelona 2004–06; Manchester United loan 2007" },
  { name:"Edgar Davids", aliases:["Davids","Pitbull"], clubs:["juve","barca","inter","ajax"], years:"Ajax, Juventus, Inter and Barcelona" },
  { name:"Patrick Kluivert", aliases:["Kluivert"], clubs:["barca","ajax","milan"], years:"Ajax, AC Milan and Barcelona" },
  { name:"Marc Overmars", aliases:["Overmars"], clubs:["arsenal","barca","ajax"], years:"Arsenal, Barcelona and Ajax" },
  { name:"Frank Rijkaard", aliases:["Rijkaard"], clubs:["milan","ajax"], years:"AC Milan and Ajax" },
  { name:"Ruud Gullit", aliases:["Gullit"], clubs:["milan","chelsea"], years:"AC Milan 1987–93; Chelsea 1995–98" },
  { name:"Dennis Wise", aliases:["Wise"], clubs:["chelsea"], years:"Chelsea 1990–2001" },
  { name:"Michael Ballack", aliases:["Ballack"], clubs:["chelsea","bayern"], years:"Bayern Munich 2002–06; Chelsea 2006–10" },
  { name:"Arjen Robben", aliases:["Arjen"], clubs:["chelsea","realmadrid","bayern"], years:"Chelsea, Real Madrid and Bayern Munich" },
  { name:"Javier Mascherano", aliases:["Mascherano"], clubs:["liverpool","barca"], years:"Liverpool 2007–10; Barcelona 2010–18" },
  { name:"Xabi Alonso", aliases:["Xabi"], clubs:["liverpool","realmadrid","bayern"], years:"Liverpool, Real Madrid and Bayern Munich" },
  { name:"Fernando Morientes", aliases:["Morientes"], clubs:["realmadrid","liverpool"], years:"Real Madrid; Liverpool loan 2005–06" },
  { name:"Michael Owen", aliases:["Owen"], clubs:["liverpool","realmadrid","manutd"], years:"Liverpool, Real Madrid and Manchester United" },
  { name:"Nicolas Anelka", aliases:["Anelka"], clubs:["arsenal","chelsea","realmadrid","psg"], years:"Arsenal, Real Madrid, PSG and Chelsea" },
  { name:"Ashley Cole", aliases:["Cole"], clubs:["arsenal","chelsea"], years:"Arsenal 1999–2006; Chelsea 2006–14" },
  { name:"Sol Campbell", aliases:["Campbell"], clubs:["arsenal"], years:"Arsenal 2001–06 and 2010" },
  { name:"Mesut Özil", aliases:["Mesut Ozil","Ozil"], clubs:["arsenal","realmadrid"], years:"Real Madrid 2010–13; Arsenal 2013–21" },
  { name:"Alexis Sánchez", aliases:["Alexis Sanchez","Alexis"], clubs:["arsenal","manutd","inter"], years:"Arsenal, Manchester United and Inter" },
  { name:"Jorginho", aliases:["Jorginho Frello"], clubs:["chelsea","arsenal"], years:"Chelsea 2018–23; Arsenal 2023–" },
  { name:"Kai Havertz", aliases:["Havertz"], clubs:["chelsea","arsenal"], years:"Chelsea 2020–23; Arsenal 2023–" },
  { name:"Cole Palmer", aliases:["Palmer","Cold Palmer"], clubs:["city","chelsea"], years:"Manchester City 2020–23; Chelsea 2023–" },
  { name:"Rúben Dias", aliases:["Ruben Dias","Dias"], clubs:["city"], years:"Manchester City 2020–" },
  { name:"Rodri Hernández", aliases:["Rodri","Rodri Hernandez"], clubs:["city","atleti"], years:"Atlético Madrid 2018–19; Manchester City 2019–" },
  { name:"Julián Álvarez", aliases:["Julian Alvarez","Julian"], clubs:["city","atleti"], years:"Manchester City 2022–24; Atlético Madrid 2024–" },
  { name:"Jürgen Klinsmann", aliases:["Jurgen Klinsmann","Klinsmann"], clubs:["inter","bayern"], years:"Inter 1989–92; Bayern Munich 1995–97" },
  { name:"Lothar Matthäus", aliases:["Lothar Matthaus","Matthaus"], clubs:["inter","bayern"], years:"Inter 1988–92; Bayern Munich multiple spells" },
  { name:"Hristo Stoichkov", aliases:["Stoichkov"], clubs:["barca"], years:"Barcelona 1990–95 and 1996–98" },
  { name:"Rivaldo", aliases:["Rivaldo Vitor"], clubs:["barca","milan"], years:"Barcelona and AC Milan" },
  { name:"Deco", aliases:["Anderson Deco"], clubs:["barca"], years:"Barcelona 2004–08" },
  { name:"Yaya Touré", aliases:["Yaya Toure"], clubs:["barca","city"], years:"Barcelona and Manchester City" },
  { name:"Alexandre Pato", aliases:["Pato"], clubs:["milan"], years:"AC Milan 2007–13" },
  { name:"Mario Balotelli", aliases:["Balotelli","Super Mario"], clubs:["inter","milan","manutd","city","liverpool"], years:"Inter, Manchester City, AC Milan and Liverpool" },
  { name:"Christian Eriksen", aliases:["Eriksen"], clubs:["manutd","inter"], years:"Inter 2020–21; Manchester United 2022–" },
  { name:"Memphis Depay", aliases:["Memphis"], clubs:["manutd","barca","atleti"], years:"Manchester United 2015–17; Barcelona 2021–23; Atlético Madrid 2023–24" },
  { name:"João Cancelo", aliases:["Joao Cancelo","Cancelo"], clubs:["city","barca","bayern","inter"], years:"Inter loan; Manchester City; Bayern and Barcelona loans" },
  { name:"Zlatan Ibrahimović", aliases:["Zlatan Ibrahimovic"], clubs:["ajax","juve","inter","barca","milan","manutd","psg"], years:"Played for all listed clubs" }

];

// Keep one canonical entry per normalized name to avoid duplicate suggestions.
const seenPlayerNames = new Set();
for (let i = PLAYERS.length - 1; i >= 0; i--) {
  const key = String(PLAYERS[i].name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (seenPlayerNames.has(key)) PLAYERS.splice(i, 1); else seenPlayerNames.add(key);
}

const rooms = new Map();
const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
function editDistance(a, b) {
  const row = Array.from({length: b.length + 1}, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(row[j] + 1, row[j-1] + 1, prev + (a[i-1] === b[j-1] ? 0 : 1));
      prev = old;
    }
  }
  return row[b.length];
}
function playerMatch(answer) {
  const a = norm(answer);
  if (!a) return null;
  const names = p => [p.name, ...(p.aliases || [])].map(norm);
  const exact = PLAYERS.find(p => names(p).includes(a));
  if (exact) return exact;
  // Accept a small typo for longer names, but avoid guessing aggressively on short answers.
  if (a.length < 5) return null;
  let best = null, bestDistance = Infinity;
  for (const p of PLAYERS) for (const n of names(p)) {
    const d = editDistance(a, n);
    const allowed = a.length >= 10 ? 2 : 1;
    if (d <= allowed && d < bestDistance) { best = p; bestDistance = d; }
  }
  return best;
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
