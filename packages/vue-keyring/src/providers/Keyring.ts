import { defineComponent, provide, computed, InjectionKey, Ref, shallowReactive, PropType } from 'vue'
import { createAgent, getCurrentSpace, getSpaces, KeyringContextState, KeyringContextActions } from '@w3ui/keyring-core'
import type { Agent } from '@web3-storage/access'
import type { Service } from '@web3-storage/access/types'
import type { Capability, DID, Proof, ConnectionView, Principal  } from '@ucanto/interface'
import type { RSASigner } from '@ucanto/principal/rsa'

export { KeyringContextState, KeyringContextActions }

/**
 * Injection keys for keyring provider context.
 */
export const KeyringProviderInjectionKey = {
  space: Symbol('w3ui keyring space') as InjectionKey<Ref<KeyringContextState['space']>>,
  spaces: Symbol('w3ui keyring spaces') as InjectionKey<Ref<KeyringContextState['spaces']>>,
  agent: Symbol('w3ui keyring agent') as InjectionKey<Ref<KeyringContextState['agent']>>,
  loadAgent: Symbol('w3ui keyring loadAgent') as InjectionKey<KeyringContextActions['loadAgent']>,
  unloadAgent: Symbol('w3ui keyring unloadAgent') as InjectionKey<KeyringContextActions['unloadAgent']>,
  resetAgent: Symbol('w3ui keyring resetAgent') as InjectionKey<KeyringContextActions['resetAgent']>,
  createSpace: Symbol('w3ui keyring createSpace') as InjectionKey<KeyringContextActions['createSpace']>,
  setCurrentSpace: Symbol('w3ui keyring setCurrentSpace') as InjectionKey<KeyringContextActions['setCurrentSpace']>,
  registerSpace: Symbol('w3ui keyring registerSpace') as InjectionKey<KeyringContextActions['registerSpace']>,
  cancelRegisterSpace: Symbol('w3ui keyring cancelRegisterSpace') as InjectionKey<KeyringContextActions['cancelRegisterSpace']>,
  getProofs: Symbol('w3ui keyring getProofs') as InjectionKey<KeyringContextActions['getProofs']>
}

/**
 * Provider for authentication with the service.
 */
export const KeyringProvider = defineComponent({
  props: {
    servicePrincipal: { type: Object as PropType<Principal> },
    connection: { type: Object as PropType<ConnectionView<Service>> }
  },

  setup({ servicePrincipal, connection }) {
    const state = shallowReactive<KeyringContextState>({
      agent: undefined,
      space: undefined,
      spaces: []
    })
    let agent: Agent<RSASigner>|undefined
    let registerAbortController: AbortController

    provide(KeyringProviderInjectionKey.agent, computed(() => state.agent))
    provide(KeyringProviderInjectionKey.space, computed(() => state.space))
    provide(KeyringProviderInjectionKey.spaces, computed(() => state.spaces))

    const getAgent = async (): Promise<Agent<RSASigner>> => {
      if (agent == null) {
        agent = await createAgent({ servicePrincipal, connection })
        state.agent = agent.issuer
        state.space = getCurrentSpace(agent)
        state.spaces = getSpaces(agent)
      }
      return agent
    }

    provide(KeyringProviderInjectionKey.cancelRegisterSpace, (): void => {
      if (registerAbortController != null) {
        registerAbortController.abort()
      }
    })

    provide(KeyringProviderInjectionKey.createSpace, async (name?: string): Promise<DID> => {
      const agent = await getAgent()
      const { did } = await agent.createSpace(name)
      await agent.setCurrentSpace(did)
      state.space = getCurrentSpace(agent)
      return did
    })

    provide(KeyringProviderInjectionKey.registerSpace, async (email: string): Promise<void> => {
      const agent = await getAgent()
      const controller = new AbortController()
      registerAbortController = controller

      try {
        await agent.registerSpace(email, { signal: controller.signal })
        state.space = getCurrentSpace(agent)
        state.spaces = getSpaces(agent)
      } catch (err) {
        if (!controller.signal.aborted) {
          throw err
        }
      }
    })

    provide(KeyringProviderInjectionKey.setCurrentSpace, async (did: DID): Promise<void> => {
      const agent = await getAgent()
      await agent.setCurrentSpace(did)
      state.space = getCurrentSpace(agent)
    })

    const loadAgent = async (): Promise<void> => {
      if (agent != null) return
      await getAgent()
    }
    provide(KeyringProviderInjectionKey.loadAgent, loadAgent)

    const unloadAgent = async (): Promise<void> => {
      state.space = undefined
      state.spaces = []
      state.agent = undefined
      agent = undefined
    }
    provide(KeyringProviderInjectionKey.unloadAgent, unloadAgent)

    provide(KeyringProviderInjectionKey.resetAgent, async (): Promise<void> => {
      const agent = await getAgent()
      await Promise.all([agent.store.reset(), unloadAgent()])
    })

    provide(KeyringProviderInjectionKey.getProofs, async (caps: Capability[]): Promise<Proof[]> => {
      const agent = await getAgent()
      return agent.proofs(caps)
    })

    // void loadAgent()

    return state
  },

  // Our provider component is a renderless component
  // it does not render any markup of its own.
  render () {
    // @ts-expect-error
    return this.$slots.default()
  }
})
