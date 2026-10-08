const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const files = {
  "/": "index.html",
  "/index.html": "index.html",
  "/game.js": "game.js",
  "/engine.mjs": "engine.mjs",
  "/art.js": "art.js",
  "/tournament.mjs": "tournament.mjs",
  "/story.mjs": "story.mjs",
  "/story-ui.js": "story-ui.js",
  "/story-art.js": "story-art.js",
  "/villains.js": "villains.js",
  "/style.css": "style.css",
  "/assets/fonts/barlow-condensed.ttf": "assets/fonts/barlow-condensed.ttf",
  "/assets/fonts/dm-sans.ttf": "assets/fonts/dm-sans.ttf",
};
const server = http.createServer((req, res) => {
  const file = files[(req.url || "/").split("?")[0]];
  res.setHeader("Cache-Control", "no-store");
  if (!file) {
    res.writeHead(404);
    return res.end("Not found");
  }
  fs.readFile(path.join(__dirname, file), (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end("Could not load game file");
    }
    res.setHeader(
      "Content-Type",
      file.endsWith(".js") || file.endsWith(".mjs")
        ? "text/javascript; charset=utf-8"
        : file.endsWith(".css")
          ? "text/css; charset=utf-8"
          : file.endsWith(".ttf")
            ? "font/ttf"
            : "text/html; charset=utf-8",
    );
    res.end(data);
  });
});
server.multiplayer = require("./multiplayer.cjs")(server);
if (require.main === module) {
  server.on("error", (err) => {
    console.error(
      err.code === "EADDRINUSE"
        ? "Port is already in use. Stop the old game server with Ctrl+C, then start again."
        : err.message,
    );
    process.exitCode = 1;
  });
  server.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
    console.log(
      "Anime Brawl running at http://localhost:" + (process.env.PORT || 3000),
    ),
  );
}
module.exports = server;
