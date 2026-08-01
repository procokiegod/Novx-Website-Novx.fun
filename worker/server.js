import http from 'node:http';
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * NOVX AI Compilation Worker
 *
 * Receives project files + options, writes a temp Maven project,
 * compiles it inside an isolated Docker container with strict resource limits,
 * and returns the build result.
 *
 * Docker constraints:
 *   --rm              : auto-delete container after completion
 *   --cpus="1"        : limit to 1 CPU
 *   --memory="2g"     : limit to 2 GB RAM
 *   --network none    : no network access
 *   --read-only       : read-only filesystem except workspace
 *   --tmpfs /tmp      : writable temp inside container
 *   timeout 120s      : kill after 120 seconds
 *
 * On failure, compiler errors are collected and returned so the
 * main app can feed them back to the AI for code regeneration.
 */

const PORT = process.env.PORT || 3001;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 120000;
const JAVA_DEFAULT = '21';

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/compile') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { files, options, projectId } = JSON.parse(body);
        const result = await compileProject(files, options, projectId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message,
          logs: error.stack || error.message,
          attempts: 1,
        }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

async function compileProject(files, options, projectId) {
  const tmpDir = `/tmp/novx-${projectId || Date.now()}`;
  await fs.mkdir(tmpDir, { recursive: true });

  // Write all files to the workspace
  for (const file of files) {
    // Validate path to prevent traversal
    if (file.path.includes('..') || file.path.startsWith('/')) {
      continue;
    }
    const filePath = path.join(tmpDir, file.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, file.content);
  }

  const javaVersion = options?.javaVersion || JAVA_DEFAULT;
  const mavenImage = `maven:3.9-eclipse-temurin-${javaVersion}`;

  let logs = '';
  let success = false;
  let attempts = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt;
    try {
      const output = execSync(
        `docker run --rm ` +
        `--cpus="1" ` +
        `--memory="2g" ` +
        `--network none ` +
        `--read-only ` +
        `--tmpfs /tmp:rw,size=512m ` +
        `-v ${tmpDir}:/build ` +
        `-w /build ` +
        `${mavenImage} ` +
        `mvn clean package -q -B 2>&1`,
        { timeout: TIMEOUT_MS, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
      logs = output;
      success = true;
      break;
    } catch (err) {
      logs = err.stdout || err.stderr || err.message;
      if (attempt < MAX_ATTEMPTS) {
        // The main app will feed errors to AI and resend fixed files
        continue;
      }
    }
  }

  // Find JAR in target/
  let jarName = null;
  if (success) {
    try {
      const targetDir = path.join(tmpDir, 'target');
      const entries = await fs.readdir(targetDir);
      jarName = entries.find((f) => f.endsWith('.jar') && !f.includes('original') && !f.includes('sources') && !f.includes('javadoc'));
    } catch {}
  }

  // Create ZIP archive of source
  let zipCreated = false;
  try {
    execSync(`cd ${tmpDir} && zip -r /tmp/novx-source-${projectId}.zip . -x target/* 2>/dev/null`, { timeout: 30000 });
    zipCreated = true;
  } catch {}

  // Read JAR and ZIP as base64 for transfer
  let jarBase64 = null;
  let zipBase64 = null;

  if (success && jarName) {
    try {
      const jarBuf = await fs.readFile(path.join(tmpDir, 'target', jarName));
      jarBase64 = jarBuf.toString('base64');
    } catch {}
  }

  if (zipCreated) {
    try {
      const zipBuf = await fs.readFile(`/tmp/novx-source-${projectId}.zip`);
      zipBase64 = zipBuf.toString('base64');
    } catch {}
  }

  // Cleanup
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  await fs.rm(`/tmp/novx-source-${projectId}.zip`, { force: true }).catch(() => {});

  return {
    success,
    logs,
    jarName,
    jarBase64,
    zipBase64,
    attempts,
    error: success ? undefined : `Build failed after ${attempts} attempts`,
  };
}

server.listen(PORT, () => {
  console.log(`NOVX AI compilation worker running on port ${PORT}`);
});
