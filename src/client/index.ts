/** QWEN Blossom presentation-only client skin (M2).
 *
 *  Mounts the two cross-fading background art layers (Light = Dreamy Blue
 *  QWEN Blossom Portrait, Dark = Moonlit Pavilion Dreamscape) and projects
 *  the conversation-active state onto <body> so CSS can dim the artwork
 *  while a chat is running. Every mutation is registered through ctx.effect
 *  with an exact-restore cleanup, so hot switching and partial-apply
 *  failures never strand or steal another activation's state. */
import type { Context } from '@deepseek-ai/cordis'
import { QWEN_BLOSSOM_DARK_ART, QWEN_BLOSSOM_LIGHT_ART } from './art.ts'
import css from './qwen-blossom.module.css'

const SKIN_OWNER = 'qwen-blossom'
const LIGHT_ART_PROPERTY = '--qwen-blossom-light-art'
const DARK_ART_PROPERTY = '--qwen-blossom-dark-art'
const CHAT_ACTIVE_ATTRIBUTE = 'data-qwen-chat-active'
/** ChatView exposes data-chat-flow inside the active-phase conversation root
 *  in every loading and content state; inspect-only views (Trajectory, …)
 *  do not, so the artwork stays at full presence there. */
const ACTIVE_CHAT_SELECTOR = "[data-phase='active'] [data-chat-flow]"
/** rc8 rebuilds this node on every keystroke; never let it wake the
 *  projection observer (input-performance red line). */
const INPUT_BACKDROP_SELECTOR = '[data-input-backdrop]'

function createBackdrop(): HTMLDivElement {
  const backdrop = document.createElement('div')
  backdrop.dataset.skinChrome = 'qwen-backdrop'
  backdrop.dataset.skinOwner = SKIN_OWNER
  backdrop.setAttribute('aria-hidden', 'true')

  const light = document.createElement('div')
  light.dataset.qwenBackdropLayer = 'light'
  const dark = document.createElement('div')
  dark.dataset.qwenBackdropLayer = 'dark'

  backdrop.append(light, dark)
  return backdrop
}

export function apply(ctx: Context): void {
  const body = document.body
  const backdrop = createBackdrop()

  // Retain exact original values before any fallible work so cleanup can
  // restore precisely what this activation changed — and nothing else.
  const previousArtProperties = new Map<string, string>()
  for (const property of [LIGHT_ART_PROPERTY, DARK_ART_PROPERTY]) {
    previousArtProperties.set(property, body.style.getPropertyValue(property))
  }
  const previousChatActive = body.getAttribute(CHAT_ACTIVE_ATTRIBUTE)
  let observer: MutationObserver | undefined

  ctx.effect(() => {
    // The skin owns this attribute for its lifetime; the lease pattern from
    // maid-atelier guarantees hot switching and partial-apply failures never
    // strand or steal another activation's body state.
    body.dataset.dshQwenBlossom = ''
    body.style.setProperty(LIGHT_ART_PROPERTY, `url("${QWEN_BLOSSOM_LIGHT_ART}")`)
    body.style.setProperty(DARK_ART_PROPERTY, `url("${QWEN_BLOSSOM_DARK_ART}")`)

    if (backdrop.parentElement !== body) body.append(backdrop)

    const syncProjectedState = (): void => {
      body.toggleAttribute(
        CHAT_ACTIVE_ATTRIBUTE,
        document.querySelector(ACTIVE_CHAT_SELECTOR) !== null,
      )
    }
    syncProjectedState()

    const isSkinChrome = (node: Node): boolean => (
      node instanceof Element && node.closest(`[data-skin-owner='${SKIN_OWNER}']`) !== null
    )

    observer = new MutationObserver((records) => {
      let relevant = false
      for (const record of records) {
        const target = record.target
        // Ghost-text backdrop churn is keystroke-rate noise; skip it both
        // when the mutation happens inside the backdrop subtree and when the
        // backdrop node itself is the added/removed payload (rc8 rebuilds
        // the whole node, so the record target is the composer parent).
        if (target instanceof Element
          && target.closest(INPUT_BACKDROP_SELECTOR) !== null) continue
        if (record.type === 'attributes') {
          relevant = true
          continue
        }
        const appNodes = [...record.addedNodes, ...record.removedNodes]
          .filter(node => node instanceof Element
            && node.closest(INPUT_BACKDROP_SELECTOR) === null
            && !isSkinChrome(node))

        if (appNodes.length > 0) relevant = true
      }
      if (relevant) syncProjectedState()
    })
    observer.observe(body, {
      attributes: true,
      attributeFilter: ['data-phase', 'data-chat-flow'],
      childList: true,
      subtree: true,
    })

    return () => {
      observer?.disconnect()
      observer = undefined
      for (const [property, value] of previousArtProperties) {
        if (value === '') body.style.removeProperty(property)
        else body.style.setProperty(property, value)
      }
      if (previousChatActive === null) body.removeAttribute(CHAT_ACTIVE_ATTRIBUTE)
      else body.setAttribute(CHAT_ACTIVE_ATTRIBUTE, previousChatActive)
      delete body.dataset.dshQwenBlossom
      backdrop.remove()
    }
  }, 'ui-skin-qwen-blossom: body attribute, background art layers and projected state')

  // Importing the CSS module injects its <style data-plugin> tag; keep the
  // binding alive so bundlers never tree-shake the side effect.
  void css
}
