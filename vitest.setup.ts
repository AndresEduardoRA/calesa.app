import '@testing-library/jest-dom/vitest'

// jsdom no trae `ResizeObserver` (los hooks que miden una caja lo usan: `useDesborde`, el cuerpo de un `<Modal>`): uno que no observa nada. Un
// test que necesita disparar un cambio de tamaño pone el suyo con `vi.stubGlobal('ResizeObserver', …)`.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
