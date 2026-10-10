import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

// jsdom lacks a few Pointer Events / scroll APIs that Radix UI primitives rely
// on (Select, Dialog). Provide inert shims so those components are testable.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}

if (typeof HTMLElement !== 'undefined') {
  const proto = HTMLElement.prototype
  if (!proto.hasPointerCapture) {
    proto.hasPointerCapture = () => false
  }
  if (!proto.setPointerCapture) {
    proto.setPointerCapture = () => {}
  }
  if (!proto.releasePointerCapture) {
    proto.releasePointerCapture = () => {}
  }
  if (!('pointerEvents' in proto)) {
    // Radix checks this before calling setPointerCapture.
    Object.defineProperty(proto, 'pointerEvents', {
      get: () => '',
      configurable: true,
    })
  }
}
