import { spawn } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const serveArgs = process.argv.slice(2);
const children = new Set();

function run(label, command, args) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    // Windows cannot directly execute .cmd launchers like npm.cmd.
    shell: process.platform === 'win32',
  });

  children.add(child);

  child.on('exit', (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    shutdown(code ?? (signal ? 1 : 0));
  });

  child.on('error', (error) => {
    console.error(`${label} failed to start:`, error);
    shutdown(1);
  });

  return child;
}

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    child.kill();
  }

  process.exitCode = code;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('react watcher', npmCommand, ['run', 'react:dev']);
run('angular dev server', npmCommand, ['run', 'ng', '--', 'serve', ...serveArgs]);
