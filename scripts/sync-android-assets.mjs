import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const distDir = path.join(repoRoot, 'dist');
const androidAssetsDir = path.join(repoRoot, 'android', 'app', 'src', 'main', 'assets', 'public');

async function main() {
  try {
    await rm(androidAssetsDir, { recursive: true, force: true });
    await mkdir(path.dirname(androidAssetsDir), { recursive: true });
    await cp(distDir, androidAssetsDir, { recursive: true });
    console.log(`Synced ${distDir} -> ${androidAssetsDir}`);
  } catch (error) {
    console.error('Failed to sync Android assets. Build the web app first with `npm run build`.', error);
    process.exitCode = 1;
  }
}

main();