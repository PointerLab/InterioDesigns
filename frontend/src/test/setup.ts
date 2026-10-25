import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// jsdom doesn't implement scrolling; the wizard scrolls to the top between steps.
window.scrollTo = () => {};

// Node 22+ has its own localStorage/sessionStorage globals, which are unusable without
// --localstorage-file and hide jsdom's. Point them back at jsdom's storage.
const { jsdom } = globalThis as unknown as { jsdom: { window: Window } };
for (const key of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(globalThis, key, { value: jsdom.window[key], configurable: true });
}
