import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
// configure Sentry
const Raven = require('raven-js');
Raven.config('https://e860d220250640e581535a5cec2118d0@sentry.io/1260942')
     .install();

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
