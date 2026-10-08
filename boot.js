const button = document.querySelector("#begin");
const story = document.querySelector("#story");
button.disabled = true;
button.textContent = "LOADING 3D CITY…";
function fail(message) {
  button.disabled = true;
  button.textContent = "GAME COULD NOT LOAD";
  story.textContent = message;
}
async function load() {
  try {
    if (location.protocol === "file:")
      throw new Error(
        "Start the game with npm start and open http://localhost:3000. Opening index.html directly does not load the 3D game.",
      );
    for (const file of ["/vendor/three.module.js", "/vendor/three.core.js"]) {
      const response = await fetch(file, { cache: "no-store" });
      if (!response.ok)
        throw new Error(
          "The 3D engine is missing. In your game terminal press Ctrl+C, then run git pull, npm ci, and npm start. Refresh this page after the server restarts.",
        );
    }
    await import("/game.js");
    button.disabled = false;
    document.querySelector("#bossRush").disabled = false;
    button.innerHTML = "ENTER THE 3D CITY <span>→</span>";
  } catch (error) {
    console.error(error);
    fail(
      error.message.includes("WebGL")
        ? "Your browser could not start 3D graphics. Enable hardware acceleration in Chrome or Edge, restart the browser, and try again."
        : error.message.includes("fetch") || error.message.includes("import")
          ? "The game files could not load. Stop the old server with Ctrl+C, run git pull, npm ci, and npm start, then refresh this page."
          : error.message,
    );
  }
}
load();
