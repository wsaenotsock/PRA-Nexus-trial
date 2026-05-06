import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const yWebsocketBin = path.resolve(__dirname, 'node_modules', 'y-websocket', 'bin', 'server.js');

console.log('Starting Yjs WebSocket server...');

const env = { ...process.env, PORT: '1234', HOST: '127.0.0.1' };

const child = spawn('node', [yWebsocketBin], { env, stdio: 'inherit' });

child.on('error', (err) => {
  console.error('Failed to start server:', err);
});

child.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});
