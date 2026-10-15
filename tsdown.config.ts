import { clientBundle } from './build/tsdown.client.ts'

export default clientBundle('@dsh-external/dsh-client-ui-skin-qwen-blossom', ['src/index.ts'], {
  portableCssModuleIds: true,
})
