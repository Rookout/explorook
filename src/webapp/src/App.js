import React, { Component } from 'react';
import 'typeface-roboto/index.css'
// import 'material-design-icons/iconfont/material-icons.css'
import './App.css';
import { Header } from './components/Header'
import Footer from './components/Footer'
import { Token } from './components/Token'
import { ReposList } from './components/ReposList'
import EulaModal from './components/EulaModal'
import { ipcRenderer } from 'electron';
import './App.scss';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true
    }
    ipcRenderer.on("indexer-worker-id", (e, id) => {
      window.indexWorkerId = id;
      this.setState({ loading: false })
    });
    ipcRenderer.send("app-window-up");
  }

  render() {
    if (this.state.loading) return (<div />);
    return (
      <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        <div>
          <Header />
          <Token />
        </div>
        <div style={{ overflow: 'auto'}}>
          <div id="content-container">
            <ReposList />
            <EulaModal />
          </div>
        </div>
        <div style={{ justifyContent: 'flex-end', marginTop: 'auto' }}>
          <Footer />
        </div>
      </div>
    );
  }
}

export default App;
