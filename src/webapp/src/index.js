import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import Raven from 'raven-js';
import { ipcRenderer } from 'electron';

// a request will be emitted from Footer.js
ipcRenderer.once("sentry-enabled-changed", (event, enabled) => {
    if (enabled) {
        console.log('enabling sentry on main window');
        Raven
            .config('https://e860d220250640e581535a5cec2118d0@sentry.io/1260942')
            .install();
    } else {
        console.log('sentry disabled on main window');
    }
});

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
