// Midnight Vault — the hand-in program (Node 22, standard library only).
// The game is plain static files under game/ and its screenshots under
// screenshots/; this program copies both into the output directory the grader
// gives it and writes the dossier the judge reads, using the kit's vendored
// library. It runs twice in the grader and both runs must write the same bytes,
// so it does nothing time- or environment-dependent: a straight copy plus a
// dossier built from the copied files.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing: the game cannot be handed in');
}
if (!existsSync(shotsDir)) {
  throw new Error('screenshots/ is missing: the game needs 3 or 4 screenshots');
}

// Start from a clean directory so a second run writes identical bytes.
// NOTE: never remove outDir itself — in the grader /output is owned by root
// and this program runs as an unprivileged user, so rmdir(outDir) fails with
// EPERM. Only its contents are cleared; the directory itself is kept.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The scorer's own caps, as the competition's rules state them: the dossier
// text is capped at 160 KiB, at most 4 screenshots of 256 KiB each, game/
// at most 993 files and 48 MiB, every path at most 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
