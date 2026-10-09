# Play with friends over the internet

Deploy the Node web service to give everyone the same public game address:

[Deploy Anime Brawl to Render](https://render.com/deploy?repo=https://github.com/Jit380/game)

1. Open that link, sign in to Render, and allow access to `Jit380/game` if requested.
2. Review the Blueprint from `main`. It creates one Node web service on the free plan, builds with `npm ci --omit=dev`, and starts with `npm start`. Deploy the Blueprint. Render shows its current plan availability and limits before deployment.
3. Wait until the service is **Live**, then copy its assigned **HTTPS service URL** from the Render dashboard. That address is your playable link; the service name does not guarantee a particular subdomain.
4. Share the service URL with friends and tournament judges. Visitors open it in their browser and choose **ENTER 3D STORY** or an arena mode; they do not install Node or sign in to a hosting account. The 3D campaign is single-player.
5. For human arena matches, both players open that same URL, select **ONLINE 2 PLAYER**, and choose a fighter. One clicks **CREATE ROOM** and shares the six-character code. The other enters it and clicks **JOIN ROOM**. Players can use different Wi-Fi networks.

`render.yaml` includes the repository, branch, Node **24.19.0**, build/start commands, and `/` health check. The production build installs the runtime dependencies, including Three.js and WebSocket support. Render supplies `PORT`; the server listens on `0.0.0.0`. The browser automatically uses secure WebSockets at `/play` when served over HTTPS. There is no database or application secret to configure.

Keep one running service instance: room state lives in server memory. A server restart or redeployment closes active matches and clears room codes; create a new room afterward. Story saves remain in each player's browser, separately for each site address.

For later updates, push the finished changes to `main`, then check the service's deployment status in Render. Both players should refresh after the new deployment is Live.

This repository provides deployment configuration. A live public URL exists only after a Render account deploys it successfully. The cloud coding workspace does not have Render account credentials configured.

Render references: [Blueprint specification](https://render.com/docs/blueprint-spec), [Node versions](https://render.com/docs/node-version), [WebSockets](https://render.com/docs/websocket), and [free service limits](https://render.com/docs/free).
