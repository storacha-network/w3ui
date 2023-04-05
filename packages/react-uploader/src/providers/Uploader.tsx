import type {
  CARMetadata,
  ProgressStatus,
  ProgressStatuses,
  ServiceConfig,
  UploaderContextActions,
  UploaderContextState
} from '@w3ui/uploader-core'
import React, { useContext, createContext, useState } from 'react'
import {
  uploadFile,
  uploadDirectory
} from '@w3ui/uploader-core'
import { useKeyring } from '@w3ui/react-keyring'
import { add as storeAdd } from '@web3-storage/capabilities/store'
import { add as uploadAdd } from '@web3-storage/capabilities/upload'

export type UploaderContextValue = [
  state: UploaderContextState,
  actions: UploaderContextActions
]

export const uploaderContextDefaultValue: UploaderContextValue = [
  {
    storedDAGShards: [],
    progressStatuses: {}
  },
  {
    uploadFile: async () => {
      throw new Error('missing uploader context provider')
    },
    uploadDirectory: async () => {
      throw new Error('missing uploader context provider')
    }
  }
]

export const UploaderContext = createContext<UploaderContextValue>(
  uploaderContextDefaultValue
)

export interface UploaderProviderProps extends ServiceConfig {
  children?: JSX.Element
}

/**
 * Provider for actions and state to facilitate uploads to the service.
 */
export function UploaderProvider ({
  servicePrincipal,
  connection,
  children
}: UploaderProviderProps): JSX.Element {
  const [{ space, agent }, { getProofs }] = useKeyring()
  const [storedDAGShards, setStoredDAGShards] = useState<
  UploaderContextState['storedDAGShards']
  >([])
  const [progressStatuses, setProgressStatuses] = useState<ProgressStatuses>({})

  const state = { storedDAGShards, progressStatuses }
  const actions: UploaderContextActions = {
    async uploadFile (file: Blob) {
      if (space == null) throw new Error('missing space')
      if (agent == null) throw new Error('missing agent')

      const storedShards: CARMetadata[] = []
      setStoredDAGShards(storedShards)

      const conf = {
        issuer: agent,
        with: space.did(),
        audience: servicePrincipal,
        proofs: await getProofs([
          { can: storeAdd.can, with: space.did() },
          { can: uploadAdd.can, with: space.did() }
        ])
      }

      const result = await uploadFile(conf, file, {
        onShardStored: (meta) => {
          storedShards.push(meta)
          setStoredDAGShards([...storedShards])
        },
        onUploadProgress: (status: ProgressStatus) => {
          setProgressStatuses(statuses => ({ ...statuses, [status.url ?? '']: status }))
        },
        connection
      })
      setProgressStatuses({})
      return result
    },
    async uploadDirectory (files: File[]) {
      if (space == null) throw new Error('missing space')
      if (agent == null) throw new Error('missing agent')

      const storedShards: CARMetadata[] = []
      setStoredDAGShards(storedShards)

      const conf = {
        issuer: agent,
        with: space.did(),
        proofs: await getProofs([
          { can: storeAdd.can, with: space.did() },
          { can: uploadAdd.can, with: space.did() }
        ])
      }

      const result = await uploadDirectory(conf, files, {
        onShardStored: (meta) => {
          storedShards.push(meta)
          setStoredDAGShards([...storedShards])
        },
        onUploadProgress: (status: ProgressStatus) => {
          setProgressStatuses(statuses => ({ ...statuses, [status.url ?? '']: status }))
        },
        connection
      })
      setProgressStatuses({})
      return result
    }
  }

  return (
    <UploaderContext.Provider value={[state, actions]}>
      {children}
    </UploaderContext.Provider>
  )
}

/**
 * Use the scoped uploader context state from a parent `UploaderProvider`.
 */
export function useUploader (): UploaderContextValue {
  return useContext(UploaderContext)
}
