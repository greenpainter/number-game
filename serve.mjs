import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.dirname(fileURLToPath(import.meta.url));
const openBrowser=process.argv.includes('--open');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.glb':'model/gltf-binary','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json','.txt':'text/plain; charset=utf-8','.mp3':'audio/mpeg','.wav':'audio/wav'};
http.createServer(async(req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+pathname);if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}if((await stat(file)).isDirectory())file=path.join(file,'index.html');const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes)}catch{res.writeHead(404);res.end('Not found')}
}).listen(openBrowser ? 0 : 4173,'127.0.0.1',function () {
  const url = `http://127.0.0.1:${this.address().port}/`;
  console.log('Local:', url);
  if (openBrowser && process.platform === 'win32') {
    const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], {
      stdio: 'ignore', windowsHide: true
    });
    browser.on('error', () => console.error('Open the Local address above in your browser.'));
    browser.unref();
  }
}).on('error', error => {
  console.error(error.message);
  if (error.code === 'EADDRINUSE') console.error('Use Play-Local.cmd to start on a free port.');
  process.exitCode = 1;
});
