const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const server = http.createServer((req,res)=>{
 const files={'/':'index.html','/index.html':'index.html','/game.js':'game.js','/style.css':'style.css'};
 const file=files[req.url.split('?')[0]];
 if(!file){res.writeHead(404);return res.end('Not found');}
 fs.readFile(path.join(root,file),(err,data)=>{if(err){res.writeHead(500);return res.end('Server error');}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});
});
if(require.main===module) server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Ultimateman running on port '+(process.env.PORT||3000)));
module.exports=server;
