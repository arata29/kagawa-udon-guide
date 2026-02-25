import { spawn } from "node:child_process";
import net from "node:net";

const PORT = String(process.env.RELEASE_CHECK_PORT || "3100");
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;

function run(command, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      shell: true,
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${command}`));
    });
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${url}/robots.txt`);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms (${url})`);
}

async function stopServer(server) {
  if (!server || server.killed) return;
  server.kill();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (!server.killed && server.pid) {
    await run(`taskkill /PID ${server.pid} /T /F`).catch(() => {});
  }
}

function assertPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const tester = net
      .createServer()
      .once("error", (error) => reject(error))
      .once("listening", () => {
        tester.close(() => resolve());
      })
      .listen(Number(port), "127.0.0.1");
  });
}

async function main() {
  await run("npm run -s lint");
  await run("npm run -s build");
  await assertPortAvailable(PORT).catch(() => {
    throw new Error(
      `Port ${PORT} is already in use. Set RELEASE_CHECK_PORT to an available port and retry.`
    );
  });

  const server = spawn(`npm run -s start -- -p ${PORT}`, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  });

  try {
    await waitForServer(BASE_URL);
    if (server.exitCode !== null) {
      throw new Error(`Server process exited before tests (code: ${server.exitCode}).`);
    }
    await run("npm run -s test:e2e:smoke", { E2E_BASE_URL: BASE_URL });
  } finally {
    await stopServer(server);
  }

  console.log("Release check passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
