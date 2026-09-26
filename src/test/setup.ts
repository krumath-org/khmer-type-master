/**
 * Vitest setup shared by all test files.
 *
 * jsdom does not implement `ResizeObserver`, which Radix Popper-based
 * components (tooltip, dropdown, etc.) need as soon as they open. Provide a
 * no-op stub so those components can mount in tests; it has no effect on the
 * browser runtime.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverStub,
    writable: true,
    configurable: true,
  });
}
