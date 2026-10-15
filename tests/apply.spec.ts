// @vitest-environment jsdom
/**
 * QWEN Blossom skin apply spec — the template contract plus this skin's
 * lifecycle guarantees: the body attribute the stylesheet is scoped on is
 * set on apply and retracted on dispose; every injected chrome element
 * (marked data-skin-chrome) is removed; dispose restores the exact body
 * state captured at activation (art CSS variables, data-qwen-chat-active),
 * so repeated activation cycles and hot switching never strand residue or
 * steal a pre-existing value.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context, type Fiber } from '@deepseek-ai/cordis'
import { apply } from '../src/client/index.ts'

const BODY_ATTR = 'data-dsh-qwen-blossom'
const BACKDROP_SELECTOR = "[data-skin-chrome='qwen-backdrop']"
const LIGHT_ART = '--qwen-blossom-light-art'
const DARK_ART = '--qwen-blossom-dark-art'
const CHAT_ACTIVE = 'data-qwen-chat-active'
const ACTIVE_CHAT_FIXTURE = `
  <div data-phase="active">
    <div data-conversation-scroll>
      <div data-chat-flow></div>
    </div>
  </div>
`

let fiber: Fiber | undefined

async function mount(): Promise<Fiber> {
  const f = new Context().plugin({ apply })
  await f.await()
  return f
}

const tick = (): Promise<void> => new Promise(resolve => { setTimeout(resolve, 0) })

afterEach(async () => {
  await fiber?.dispose()
  fiber = undefined
  document.body.innerHTML = ''
  for (const attribute of [...document.body.attributes]) {
    document.body.removeAttribute(attribute.name)
  }
  vi.restoreAllMocks()
})

describe('QWEN Blossom skin apply', () => {
  it('sets the body attribute and retracts it on dispose', async () => {
    fiber = await mount()
    expect(document.body.hasAttribute(BODY_ATTR)).toBe(true)
    await fiber.dispose()
    expect(document.body.hasAttribute(BODY_ATTR)).toBe(false)
  })

  it('injects the cross-fade backdrop and retracts every element on dispose', async () => {
    fiber = await mount()
    const backdrops = document.body.querySelectorAll(BACKDROP_SELECTOR)
    expect(backdrops).toHaveLength(1)
    const backdrop = backdrops[0]
    expect(backdrop?.getAttribute('data-skin-owner')).toBe('qwen-blossom')
    expect(backdrop?.getAttribute('aria-hidden')).toBe('true')
    expect(backdrop?.parentElement).toBe(document.body)
    expect(backdrop?.querySelectorAll(":scope > [data-qwen-backdrop-layer='light']")).toHaveLength(1)
    expect(backdrop?.querySelectorAll(":scope > [data-qwen-backdrop-layer='dark']")).toHaveLength(1)
    expect(document.body.style.getPropertyValue(LIGHT_ART)).toContain('url("data:image/webp;base64,')
    expect(document.body.style.getPropertyValue(DARK_ART)).toContain('url("data:image/webp;base64,')

    await fiber.dispose()
    expect(document.body.querySelectorAll('[data-skin-chrome]').length).toBe(0)
    expect(document.body.style.getPropertyValue(LIGHT_ART)).toBe('')
    expect(document.body.style.getPropertyValue(DARK_ART)).toBe('')
  })

  it('restores pre-existing body state exactly on dispose (hot-switch precision)', async () => {
    // A previous activation or the host itself may already own these slots;
    // dispose must give back precisely what was captured, not a blank slate.
    document.body.style.setProperty(LIGHT_ART, 'url("sentinel-light")')
    document.body.style.setProperty(DARK_ART, 'url("sentinel-dark")')
    document.body.setAttribute(CHAT_ACTIVE, 'sentinel')

    fiber = await mount()
    expect(document.body.style.getPropertyValue(LIGHT_ART)).not.toContain('sentinel')
    // The projection re-derives the flag: no active chat in this document.
    expect(document.body.hasAttribute(CHAT_ACTIVE)).toBe(false)

    await fiber.dispose()
    expect(document.body.style.getPropertyValue(LIGHT_ART)).toBe('url("sentinel-light")')
    expect(document.body.style.getPropertyValue(DARK_ART)).toBe('url("sentinel-dark")')
    expect(document.body.getAttribute(CHAT_ACTIVE)).toBe('sentinel')
    expect(document.body.hasAttribute(BODY_ATTR)).toBe(false)
  })

  it('leaves no residue across repeated activation cycles (apply/dispose idempotency)', async () => {
    for (let cycle = 0; cycle < 2; cycle += 1) {
      fiber = await mount()
      expect(document.body.hasAttribute(BODY_ATTR)).toBe(true)
      expect(document.body.querySelectorAll(BACKDROP_SELECTOR)).toHaveLength(1)
      expect(document.body.style.getPropertyValue(LIGHT_ART)).toContain('data:image/webp')

      await fiber.dispose()
      fiber = undefined
      expect(document.body.hasAttribute(BODY_ATTR)).toBe(false)
      expect(document.body.querySelectorAll('[data-skin-chrome]').length).toBe(0)
      expect(document.body.style.getPropertyValue(LIGHT_ART)).toBe('')
      expect(document.body.style.getPropertyValue(DARK_ART)).toBe('')
      expect(document.body.hasAttribute(CHAT_ACTIVE)).toBe(false)
    }
  })

  it('projects the active-chat state onto the body and tracks conversation swaps', async () => {
    document.body.innerHTML = '<div data-phase="hero"><div data-conversation-scroll></div></div>'
    fiber = await mount()
    expect(document.body.hasAttribute(CHAT_ACTIVE)).toBe(false)

    const root = document.querySelector<HTMLElement>('[data-phase]')!
    root.dataset.phase = 'active'
    root.querySelector('[data-conversation-scroll]')!.innerHTML = '<div data-chat-flow></div>'
    await tick()
    expect(document.body.hasAttribute(CHAT_ACTIVE)).toBe(true)

    // An inspect-only view (no data-chat-flow under the active phase) returns
    // the artwork to full presence.
    root.querySelector('[data-chat-flow]')!.remove()
    await tick()
    expect(document.body.hasAttribute(CHAT_ACTIVE)).toBe(false)

    root.innerHTML = ACTIVE_CHAT_FIXTURE.replace(/^\s+/, '')
    await tick()
    expect(document.body.hasAttribute(CHAT_ACTIVE)).toBe(true)
  })

  it('never lets ghost-text backdrop churn wake the projection (input-performance red line)', async () => {
    document.body.innerHTML = '<div data-phase="active"><div data-composer-seat></div></div>'
    fiber = await mount()
    const seat = document.querySelector<HTMLElement>('[data-composer-seat]')!
    const sync = vi.spyOn(document.body, 'toggleAttribute')

    // rc8 rebuilds the whole [data-input-backdrop] node on every keystroke:
    // the record target is the composer parent, the backdrop node itself is
    // the added/removed payload. Neither may wake the projection.
    const ghost = document.createElement('div')
    ghost.setAttribute('data-input-backdrop', '')
    seat.append(ghost)
    await tick()
    expect(sync).not.toHaveBeenCalled()

    ghost.remove()
    const rebuilt = document.createElement('div')
    rebuilt.setAttribute('data-input-backdrop', '')
    seat.append(rebuilt)
    await tick()
    expect(sync).not.toHaveBeenCalled()

    // Character data inside the backdrop subtree is filtered the same way.
    rebuilt.textContent = 'draft text'
    await tick()
    expect(sync).not.toHaveBeenCalled()

    // A genuine app mutation still re-projects immediately.
    seat.insertAdjacentHTML('beforeend', '<div data-chat-flow></div>')
    await tick()
    expect(sync).toHaveBeenCalled()
    expect(document.body.hasAttribute(CHAT_ACTIVE)).toBe(true)
  })

  it('ignores its own chrome mutations and disconnects the observer on dispose', async () => {
    fiber = await mount()
    await fiber.dispose()
    fiber = undefined

    // After teardown, real conversation activity must not resurrect the flag.
    document.body.insertAdjacentHTML('beforeend', ACTIVE_CHAT_FIXTURE)
    await tick()
    expect(document.body.hasAttribute(CHAT_ACTIVE)).toBe(false)
    expect(document.body.hasAttribute(BODY_ATTR)).toBe(false)
    expect(document.body.querySelectorAll('[data-skin-chrome]').length).toBe(0)
  })
})
