/**
 * OpenGenTree's own version (OGT-012). Strom's version (APP_VERSION, from
 * package.json) stays as it is: the app's data format, update checks and
 * release notes rely on it. This one is what the About dialog shows as the
 * fork's version; scripts/ogt/prepare-public.mjs reads it from this file.
 * Bump it with every OpenGenTree release (docs/ogt/CHANGELOG.md).
 */
export const OGT_VERSION = '0.2.0';
