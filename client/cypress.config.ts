import { defineConfig } from 'cypress';
import { spawn } from 'child_process';
import http from 'http';

function waitForUrl(url: string, timeoutMs = 90000, intervalMs = 1000): Promise<void> {
  const end = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(url, (res) => {
        // any response means server is up
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() > end) reject(new Error(`Timeout waiting for ${url}`));
        else setTimeout(tryOnce, intervalMs);
      });
    };
    tryOnce();
  });
}

let ngProc: ReturnType<typeof spawn> | undefined;

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    setupNodeEvents(on, config) {
      // Auto-start Angular dev server when Cypress is opened directly.
      const base = (config.baseUrl as string) || 'http://localhost:4200';
      const shouldStart = String(process.env.CYPRESS_START_SERVER || 'true') !== 'false';

      const ensureServer = async () => {
        try {
          await waitForUrl(base);
        } catch {
          if (!shouldStart) return;
          // spawn ng serve only if not already started
          if (!ngProc) {
            const args = ['serve', '--port', '4200', '-c', 'development', '--proxy-config', 'proxy.conf.json'];
            ngProc = spawn(process.platform === 'win32' ? 'ng.cmd' : 'ng', args, { stdio: 'ignore', shell: false });
            // kill on Cypress process exit
            const killNg = () => {
              try { ngProc?.kill(); } catch {}
              ngProc = undefined;
            };
            process.on('exit', killNg);
            process.on('SIGINT', killNg);
            process.on('SIGTERM', killNg);
          }
          // wait again for readiness
          await waitForUrl(base, 120000, 1000);
        }
      };

      // For open mode, we cannot block the splash screen, but we can ensure readiness before each run
      on('before:run', async () => {
        await ensureServer();
      });

      // Also try to ensure on config load for run-mode
      // Return config in case we modified env
      return config;
    }
  }
});
