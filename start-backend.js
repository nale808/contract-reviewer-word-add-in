// Launcher: starts the backend dev server via ts-node
// Used by .claude/launch.json so preview_start can invoke it with node directly.
process.chdir(__dirname + '/backend');
require('dotenv').config();

// Register ts-node so we can require TypeScript files
require('ts-node').register({
  project: __dirname + '/backend/tsconfig.json',
  transpileOnly: true,
});

require('./backend/src/server.ts');
