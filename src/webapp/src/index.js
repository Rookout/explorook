import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import bugsnag from '@bugsnag/js';
import { ipcRenderer } from 'electron';

// a request will be emitted from Footer.js
ipcRenderer.once("exception-manager-enabled-changed", (event, enabled) => {
    if (enabled) {
        console.log('enabling bugsnag on react');
        bugsnag({
            apiKey: '6e673fda179162f48a2c6b5d159552d2',
            appVersion: ipcRenderer.sendSync("version-request"),
            appType: 'explorook-react',
            releaseStage: ipcRenderer.sendSync("is-dev") ? 'development' : 'production'
        });
    } else {
        console.log('bugsnag disabled on react');
    }
});

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
