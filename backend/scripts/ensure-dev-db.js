#!/usr/bin/env node

const net = require('net');
const { spawnSync } = require('child_process');

const isDevelopment = (process.env.NODE_ENV || 'development') === 'development';
const skipAutoStart = process.env.SKIP_DOCKER_DB_AUTOSTART === 'true';

if (!isDevelopment || skipAutoStart) {
  process.exit(0);
}

const host = process.env.POSTGRES_HOST || '127.0.0.1';
const port = Number(process.env.POSTGRES_PORT || 5432);

function runDockerCompose(args) {
  const result = spawnSync(
    'docker',
    ['compose', '-f', 'docker-compose.dev.yml', ...args],
    { stdio: 'inherit' }
  );
  return result.status === 0;
}

function canOpenPort(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;

    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
    socket.connect(port, host);
  });
}

async function waitForPort(maxWaitMs = 30000, stepMs = 1000) {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    // eslint-disable-next-line no-await-in-loop
    if (await canOpenPort()) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, stepMs));
  }
  return false;
}

async function main() {
  if (await canOpenPort()) {
    console.log(`ℹ️ PostgreSQL already reachable at ${host}:${port}`);
    return;
  }

  console.log('🐳 Starting development PostgreSQL with Docker...');
  const started = runDockerCompose(['up', '-d', 'postgres']);
  if (!started) {
    console.error(
      '❌ Could not start Docker Postgres. Ensure Docker is running or set SKIP_DOCKER_DB_AUTOSTART=true.'
    );
    process.exit(1);
  }

  console.log('⏳ Waiting for PostgreSQL to accept connections...');
  const ready = await waitForPort();
  if (!ready) {
    console.error(
      `❌ PostgreSQL did not become reachable at ${host}:${port} in time. Check "docker compose -f docker-compose.dev.yml ps".`
    );
    process.exit(1);
  }

  console.log(`✅ PostgreSQL ready at ${host}:${port}`);
}

main().catch((error) => {
  console.error('❌ Failed while ensuring development database:', error.message);
  process.exit(1);
});
