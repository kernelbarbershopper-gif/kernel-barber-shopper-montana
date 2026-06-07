// Vitest setup: stubs and global mocks.
import { afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Polyfill matchMedia for jsdom
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});
