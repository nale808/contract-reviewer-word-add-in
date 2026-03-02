// Launcher: starts the frontend webpack dev server via Node API.
// Used by .claude/launch.json so preview_start can invoke it with node directly.
const path = require('path');

process.chdir(path.join(__dirname, 'frontend'));

const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./frontend/webpack.config.js');

const compiler = webpack(config);
const server = new WebpackDevServer(config.devServer, compiler);

server.start().then(() => {
  console.log('[frontend] Task pane dev server running on http://localhost:3000');
  console.log('[frontend] Preview at http://localhost:3000/taskpane.html');
}).catch((err) => {
  console.error('[frontend] Failed to start:', err);
  process.exit(1);
});
