import React, { Component } from 'react';
import 'typeface-roboto/index.css'
// import 'material-design-icons/iconfont/material-icons.css'
import './App.css';
import { Header } from './components/Header'
import Footer from './components/Footer'
import { Token } from './components/Token'
import { ReposList } from './components/ReposList'

class App extends Component {
  render() {
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
