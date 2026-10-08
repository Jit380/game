const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const server = http.createServer((req, res) => {
  const files = {
    "/": "index.html",
    "/index.html": "index.html",
    "/game.js": "game.js",
    "/boot.js": "boot.js",
    "/style.css": "style.css",
    "/vendor/three.module.js": "node_modules/three/build/three.module.js",
    "/vendor/three.core.js": "node_modules/three/build/three.core.js",
  };
  const file = files[req.url.split("?")[0]];
  if (!file) {
    res.writeHead(404);
    return res.end("Not found");
  }
  fs.readFile(path.join(root, file), (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end("Server error");
    }
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(data);
  });
});
if (
  require.main === module &&
  !fs.existsSync(path.join(root, "node_modules/three/build/three.module.js"))
) {
  console.error(
    "Missing 3D engine. Run npm ci in the game folder, then npm start.",
  );
  process.exit(1);
}
if (require.main === module)
  server.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
    console.log("Ultimateman running on port " + (process.env.PORT || 3000)),
  );
module.exports = server;
