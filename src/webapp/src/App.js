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
      <div className="App">
        <Header />
        <div id="content-container">
          <Token />
          <ReposList />
        </div>
        <Footer />
      </div>
      // <table className="App" style={{width: "100%"}}>
      //   <tr>
      //     <td valign="top" id="content-container">
      //       <Header />
      //       <Token />
      //       <ReposList />
      //     </td>
      //   </tr>
      //   <tr>
      //     <td valign="bottom">
      //       <Footer />
      //     </td>
      //   </tr>
      // </table>
    );
  }
}

export default App;
