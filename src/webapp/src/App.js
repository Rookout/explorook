import React, { useEffect, useState } from 'react'
import { ipcRenderer } from 'electron'
import './App.css'
import 'typeface-roboto/index.css'
import { Header } from './components/Header'
import Footer from './components/Footer'
import { ReposList } from './components/ReposList'
import { EulaModal } from './components/EulaModal'
import { EmptyState } from './components/EmptyState'

const INITIAL_HAS_SIGNED_EULA = ipcRenderer.sendSync('has-signed-eula')

export const App = ({ ...props }) => {
  const [loading, setLoading] = useState(true)
  const [hasSignedEula, setHasSignedEula] = useState(INITIAL_HAS_SIGNED_EULA)

  useEffect(() => {
    // "indexer-worker-id" event should be subscribed to BEFORE "app-window-up" event
    // because this is the event that will trigger it
    ipcRenderer.on('indexer-worker-id', (e, id) => {
      window.indexWorkerId = id
      setLoading(false)
    })
    ipcRenderer.send('app-window-up')
  }, [])

  if (loading) {
    return <div />
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div>
        <Header />
      </div>
      {hasSignedEula && <EmptyState />}
      {hasSignedEula && <ReposList />}
      {!hasSignedEula && (
        <div style={{ overflow: 'auto' }}>
          <div id='content-container'>
            <EulaModal setSignedEula={setHasSignedEula} {...props} />
          </div>
        </div>
      )}
      <div style={{ justifyContent: 'flex-end', marginTop: 'auto' }}>
        <Footer />
      </div>
    </div>
  )
}
