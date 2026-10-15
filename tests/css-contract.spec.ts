/**
 * QWEN Blossom stylesheet contract spec — asserts the theme-selector
 * contract (light/dark token blocks both scoped to the skin body attribute
 * and the DSH native dark attribute), the pure-CSS backdrop cross-fade, and
 * the repository red lines (no #root ID selector, skin layers below the
 * host modal z-index contract, no body-level :has, no 2^31 magic numbers).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/client/qwen-blossom.module.css', 'utf8')
// Strip comments so header prose mentioning forbidden patterns (e.g. "#root")
// never trips the red-line assertions.
const code = css.replace(/\/\*[\s\S]*?\*\//g, '')

const LIGHT_BLOCK = "body[data-dsh-qwen-blossom]:not([data-ds-dark-theme]) {"
const DARK_BLOCK = 'body[data-dsh-qwen-blossom][data-ds-dark-theme] {'

function tokenBlock(selector: string): string {
  const start = code.indexOf(selector)
  expect(start, `missing token block: ${selector}`).toBeGreaterThan(-1)
  const rest = code.slice(start)
  const end = rest.indexOf('\n}')
  expect(end, `unterminated token block: ${selector}`).toBeGreaterThan(-1)
  return rest.slice(0, end)
}

const CORE_TOKENS = [
  '--qwen-text:',
  '--qwen-text-soft:',
  '--qwen-text-faint:',
  '--qwen-surface:',
  '--qwen-surface-strong:',
  '--qwen-surface-overlay:',
  '--qwen-sidebar-fill:',
  '--qwen-line-outer:',
  '--qwen-line-inner:',
  '--qwen-shadow:',
  '--qwen-composer-surface:',
  '--qwen-corner-a:',
  '--qwen-corner-b:',
  '--qwen-band-art:',
]

describe('QWEN Blossom stylesheet contract', () => {
  it('defines both theme token blocks scoped to the skin body attribute', () => {
    const light = tokenBlock(LIGHT_BLOCK)
    const dark = tokenBlock(DARK_BLOCK)
    for (const token of CORE_TOKENS) {
      expect(light, `light block lacks ${token}`).toContain(token)
      expect(dark, `dark block lacks ${token}`).toContain(token)
    }
    // Contrast anchors verified in M2 (>= 4.5:1 against each theme's canvas).
    expect(light).toContain('--qwen-text: #23306b;')
    expect(dark).toContain('--qwen-text: #eef2ff;')
    // The host base must stay transparent so the artwork shows through.
    expect(light).toContain('--dsw-alias-bg-base: transparent !important;')
    expect(dark).toContain('--dsw-alias-bg-base: transparent !important;')
  })

  it('overrides the host --dsw-* tokens with !important in both themes', () => {
    const light = tokenBlock(LIGHT_BLOCK)
    const dark = tokenBlock(DARK_BLOCK)
    for (const block of [light, dark]) {
      // Every --dsw-* binding inside the token blocks carries !important
      // (host inline token suppression, rc adaptation red line).
      const dswBindings = [...block.matchAll(/--dsw-[^:]+:\s*[^;]+;/g)]
      expect(dswBindings.length).toBeGreaterThan(20)
      for (const binding of dswBindings) {
        expect(binding[0], `missing !important: ${binding[0]}`).toContain('!important')
      }
    }
  })

  it('cross-fades the two art layers on the native dark attribute without JS theming', () => {
    const backdrop = tokenBlock(`body[data-dsh-qwen-blossom] [data-skin-chrome='qwen-backdrop'] {`)
    expect(backdrop).toContain('position: fixed;')
    expect(backdrop).toContain('z-index: -1;')
    expect(backdrop).toContain('contain: strict;')
    expect(backdrop).toContain('pointer-events: none;')

    expect(code).toContain("body[data-dsh-qwen-blossom] [data-qwen-backdrop-layer='light'] {\n  background-image: var(--qwen-blossom-light-art);")
    expect(code).toContain("body[data-dsh-qwen-blossom] [data-qwen-backdrop-layer='dark'] {\n  background-image: var(--qwen-blossom-dark-art);")
    // Pure-CSS cross-fade driven by the DSH native attribute — the skin never
    // watches prefers-color-scheme itself.
    expect(code).toContain("body[data-dsh-qwen-blossom]:not([data-ds-dark-theme]) [data-qwen-backdrop-layer='light']")
    expect(code).toContain('body[data-dsh-qwen-blossom][data-ds-dark-theme] [data-qwen-backdrop-layer=\'dark\']')
    expect(code).not.toContain('prefers-color-scheme')
  })

  it('dims the artwork while a chat is active', () => {
    const dim = tokenBlock(`body[data-dsh-qwen-blossom][data-qwen-chat-active] [data-skin-chrome='qwen-backdrop'] {`)
    expect(dim).toContain('opacity: 0.55;')
    expect(tokenBlock(`body[data-dsh-qwen-blossom] [data-skin-chrome='qwen-backdrop'] {`))
      .toContain('transition: opacity 320ms ease;')
  })

  it('keeps input text explicit and frames the assistant card for readability', () => {
    expect(code).toContain('-webkit-text-fill-color')
    expect(code).toContain("::placeholder")
    expect(code).toContain("[data-chat-flow-kind='assistant-step']")
    // 靛金双线框: outer border + inset gold ring on overlays.
    expect(code).toContain('box-shadow: inset 0 0 0 1px var(--qwen-line-inner-soft)')
  })

  it('releases the sidebar stacking context while a modal dialog is open', () => {
    const release = code.indexOf("> :has([role='dialog'][aria-modal='true']) {")
    expect(release).toBeGreaterThan(-1)
    expect(code.slice(release, release + 120)).toContain('z-index: auto !important;')
  })

  it('honors the repository red lines', () => {
    // No #root ID selector (CSS Modules hashing); the attribute form only.
    expect(code).not.toContain('#root')
    expect(code).toContain("body[data-dsh-qwen-blossom] [id='root']")
    // Skin layers stay strictly below the host modal contract (z-index 1000).
    for (const match of code.matchAll(/z-index:\s*(-?[\d.]+)/g)) {
      expect(Number(match[1]), `z-index escapes the contract: ${match[0]}`).toBeLessThan(1000)
    }
    // No body-level :has (input-performance red line); scoped :has only.
    expect(code).not.toMatch(/body\[[^\]]*\]:has\(/)
    // No 2^31-adjacent magic numbers (lightningcss rewrites them).
    expect(code).not.toMatch(/\b21474[0-9]{5}\b/)
  })

  it('embeds the classical corner/band art as inline SVG data URIs', () => {
    // 回纹角花 A/B per theme + 回纹分隔带 per theme = six data-URI payloads.
    expect(code.match(/%3Csvg/g)?.length).toBeGreaterThanOrEqual(6)
    // No remote or file-path runtime assets anywhere in the stylesheet.
    for (const match of code.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/g)) {
      expect(match[2].startsWith('data:'), `non-embedded asset: ${match[2].slice(0, 60)}`).toBe(true)
    }
  })

  it('disables backdrop motion for reduced-motion users', () => {
    const start = code.indexOf('@media (prefers-reduced-motion: reduce)')
    expect(start).toBeGreaterThan(-1)
    const block = code.slice(start)
    expect(block).toContain("[data-skin-chrome='qwen-backdrop']")
    expect(block).toContain('[data-qwen-backdrop-layer]')
    expect(block).toContain('transition: none;')
  })
})
