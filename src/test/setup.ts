import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// The default 1s async-util timeout is too tight under parallel test load:
// fake-indexeddb seeding + the router's async `beforeLoad` occasionally exceed
// it, making otherwise-deterministic tests flaky. Give async utils headroom.
configure({ asyncUtilTimeout: 5000 })

// jsdom lacks a few Pointer Events / scroll APIs that Radix UI primitives rely
// on (Select, Dialog). Provide inert shims so those components are testable.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
}

// Radix primitives (ScrollArea, DropdownMenu, …) observe element size.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver
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
