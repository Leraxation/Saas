import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Whether a generated asset has actually been written into public/.
 *
 * Reveal assets are produced by Higgsfield and extracted into the repo, so on
 * any given checkout they may not exist yet. Server components call this to
 * render an intentional empty stage instead of a broken image.
 *
 * Server-only: it reads the filesystem.
 */
export function hasGeneratedAsset(publicPath: string): boolean {
  if (!publicPath.startsWith("/")) return false;
  return existsSync(path.join(process.cwd(), "public", publicPath.slice(1)));
}

/** The asset's URL when it exists, otherwise null. */
export function generatedAsset(publicPath: string): string | null {
  return hasGeneratedAsset(publicPath) ? publicPath : null;
}
