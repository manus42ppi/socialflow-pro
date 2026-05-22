import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// Inject build metadata at compile-time so the sidebar can show which
// commit is deployed — lets you verify a Cloudflare Pages deploy is live.
//
// Cloudflare Pages (and most CI systems) do a shallow clone (depth=1),
// so `git rev-list --count HEAD` would return 1. We unshallow first to
// get the real commit count. On a full local clone --unshallow fails
// harmlessly and we proceed with the existing full history.
function getBuildMeta() {
  try {
    try {
      execSync('git fetch --unshallow --quiet', { stdio: 'pipe', timeout: 30_000 });
    } catch { /* already a full clone, or no remote — safe to ignore */ }
    const count = execSync('git rev-list --count HEAD').toString().trim();
    const sha   = execSync('git rev-parse --short HEAD').toString().trim();
    return { count, sha };
  } catch {
    return { count: '0', sha: 'dev' };
  }
}
const { count: BUILD_NUMBER, sha: BUILD_SHA } = getBuildMeta();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
    // When accessed via Wrangler proxy (port 8788), HMR WebSocket must still
    // connect directly to Vite (port 5173) — Wrangler doesn't forward WS.
    hmr: { port: 5173 },
  },
  define: {
    __BUILD_NUMBER__: JSON.stringify(BUILD_NUMBER),
    __BUILD_SHA__:    JSON.stringify(BUILD_SHA),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    // Only pick up files inside src/ — never touch e2e/ (those are Playwright)
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/__tests__/', 'e2e/'],
    },
  },
})
