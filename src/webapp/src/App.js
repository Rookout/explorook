import React, { Component } from 'react';
import 'typeface-roboto/index.css'
// import 'material-design-icons/iconfont/material-icons.css'
import './App.css';
import { Header } from './components/Header'
import { Token } from './components/Token'
import { ReposList } from './components/ReposList'
const Store = require('electron-store');
const uuidv4 = window.require("uuid/v4");

class App extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div className="App">
        <Header />
        <div id="content-container">
          <Token />
          <ReposList />
        </div>
      </div>
    );
  }
}

export default App;
