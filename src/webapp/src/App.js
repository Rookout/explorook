import React, { useEffect, useState } from 'react'
import { ipcRenderer } from 'electron'
import './App.css'
import './Fonts.css'
import { Header } from './components/Header'
import Footer from './components/Footer'
import { EmptyState } from './components/EmptyState'
import {ReposAddHandler} from "./components/ReposAddHandler";


export const App = () => {
  const [loading, setLoading] = useState(true)

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
      <Header />
        <EmptyState />
        <ReposAddHandler/>
      <Footer />
    </div>
  )
}
