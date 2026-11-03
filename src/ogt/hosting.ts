/**
 * OpenGenTree hosting: the addresses where this fork runs as a hosted web app.
 *
 * Strom picks its mode by hostname (pwa.ts, appModeFor): stromapp.info is the
 * hosted PWA, localhost is dev, and every other address is treated as an
 * exported single-file tree ('embedded': "go to stromapp.info" banner, a
 * warning before closing, export button as "save file"). On our own domain
 * the app is the hosted app, not an exported file, so these hostnames get the
 * 'server' mode instead. Kept in this file so upstream files change by one
 * line only (see docs/ogt/PATCHES.md).
 */

/** Hostnames that serve OpenGenTree as a hosted app (lower case). */
export const OGT_HOSTNAMES: readonly string[] = [
    'opengentree.smart-ant.pl',
];

/** True when this hostname serves OpenGenTree as a hosted app. Pure for testing. */
export function isOgtHost(hostname: string): boolean {
    return OGT_HOSTNAMES.includes(hostname.toLowerCase());
}
