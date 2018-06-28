import React, { Component } from 'react';
import 'typeface-roboto/index.css'
// import 'material-design-icons/iconfont/material-icons.css'
import './App.css';
import { Header } from './components/Header'
import Footer from './components/Footer'
import { Token } from './components/Token'
import { ReposList } from './components/ReposList'
require = window.require;
const { ipcRenderer } = require('electron');

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
      <table className="App">
        <tbody>
          <tr>
            <td valign="top">
              <Header />
              <div id="content-container">
                <Token />
                <ReposList />
              </div>
            </td>
          </tr>
          <tr>
            <td valign="bottom">
              <Footer />
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}

export default App;
