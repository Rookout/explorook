import React from 'react';
import ReactDOM from 'react-dom';
import { App } from './App';
import registerServiceWorker from './registerServiceWorker';
import bugsnag from '@bugsnag/js';
import { ipcRenderer } from 'electron';
import { app } from '@electron/remote';

// a request will be emitted from Footer.js
ipcRenderer.once("exception-manager-enabled-changed", (event, enabled) => {
    if (enabled) {
        console.log('enabling bugsnag on main window');
        bugsnag({
          onUncaughtException: (err) => {
            // override default behaviour to not crash
            // https://docs.bugsnag.com/platforms/javascript/configuration-options/#onuncaughtexception-node-js-only
            console.log(err)
          },
          projectRoot: app.getAppPath(),
          apiKey: '6e673fda179162f48a2c6b5d159552d2',
          appType: 'explorook-react',
          appVersion: app.getVersion(),
          releaseStage: app.isPackaged ? 'production' : 'development',
          beforeSend: report => {
            report.updateMetaData("user", {
              userID: ipcRenderer.sendSync("get-user-id")
            });
          }
        });
    } else {
      console.log('bugsnag disabled on main window');
    }
});

ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
