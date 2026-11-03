/**
 * OpenGenTree (OGT-009): our domain is the hosted app, not an exported file.
 */

import { describe, it, expect } from 'vitest';
import { appModeFor, shouldRegisterServiceWorker, isBetaLocation } from '../pwa.js';
import { isOgtHost, OGT_HOSTNAMES } from '../ogt/hosting.js';

describe('OpenGenTree hosting', () => {
    it('runs as the hosted app on opengentree.smart-ant.pl', () => {
        expect(isOgtHost('opengentree.smart-ant.pl')).toBe(true);
        expect(isOgtHost('OpenGenTree.Smart-Ant.pl')).toBe(true);
        expect(appModeFor('opengentree.smart-ant.pl')).toBe('server');
    });

    it('does not register a service worker there (none is served yet)', () => {
        expect(shouldRegisterServiceWorker(appModeFor('opengentree.smart-ant.pl'))).toBe(false);
    });

    it('is not the beta build', () => {
        expect(isBetaLocation('opengentree.smart-ant.pl', '/')).toBe(false);
    });

    it('leaves Strom\'s own modes as they were', () => {
        expect(appModeFor('stromapp.info')).toBe('pwa');
        expect(appModeFor('beta.stromapp.info')).toBe('pwa');
        expect(appModeFor('localhost')).toBe('dev');
        expect(appModeFor('example.com')).toBe('embedded');
        expect(appModeFor('smart-ant.pl')).toBe('embedded');
        expect(appModeFor('evil-opengentree.smart-ant.pl.example.com')).toBe('embedded');
    });

    it('lists hostnames in lower case', () => {
        for (const h of OGT_HOSTNAMES) expect(h).toBe(h.toLowerCase());
    });
});
