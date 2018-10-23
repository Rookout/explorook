import React, { Component } from 'react';
import { Close } from '@material-ui/icons';
import blueGrey from '@material-ui/core/colors/blueGrey';
import { withStyles } from '@material-ui/core/styles';
import { Checkbox, FormControlLabel, FormGroup } from "@material-ui/core";
require = window.require;
const { ipcRenderer } = require('electron');

const AUTO_LAUNCH_EXPLAINATION = "Run Explorook on machine startup";

const styles = {
    root: {
        color: blueGrey[500],
        '&$checked': {
            color: blueGrey[500],
        },
    },
    checked: {},
}

class Footer extends Component {
    constructor(props) {
        super(props);
        this.state = {
            autoLaunchEnabled: false,
            sentryEnabled: false, 
        };
        ipcRenderer.on("auto-launch-is-enabled-changed", (event, isEnabled) => {
            this.setState({ autoLaunchEnabled: isEnabled })
        });
        ipcRenderer.on("sentry-enabled-changed", (event, isEnabled) => {
            this.setState({ sentryEnabled: isEnabled })
        });
        ipcRenderer.send("auto-launch-is-enabled-req");
        ipcRenderer.send("sentry-is-enabled-req");
    }

    onAutoLaunchChecked(event) {
        ipcRenderer.send("auto-launch-set", event.target.checked);
    }

    onSentryEnableChecked(event) {
        ipcRenderer.send("sentry-enabled-set", event.target.checked);
        alert("Changes will take effect after you restart Explorook");
    }

    getPlatformCheckboxText() {
        const dic = {
            'linux': 'Linux',
            'darwin': 'MacOS',
            'win32': 'Windows'
        }
        const pcName = dic[ipcRenderer.sendSync("get-platform")] || "PC"
        return `Start With ${pcName}`;
    }

    render() {
        const { classes } = this.props;
        return (
            <div id="footer-container">
                <hr className="Header-line"></hr>
                <FormGroup row id="checkboxes-group">
                    <Checkbox
                        checked={this.state.autoLaunchEnabled}
                        onChange={this.onAutoLaunchChecked}
                        classes={{
                            root: classes.root,
                            checked: classes.checked,
                        }}
                    />
                    <p title={AUTO_LAUNCH_EXPLAINATION} className="gray-shaded">{this.getPlatformCheckboxText()}</p>
                    <Checkbox
                        checked={this.state.sentryEnabled}
                        onChange={this.onSentryEnableChecked}
                        classes={{
                            root: classes.root,
                            checked: classes.checked,
                        }}
                    />
                    <p title="Allow reporting erros to our servers" className="gray-shaded">Allow errors collection</p>
                </ FormGroup>
            </div>
        )
    }
}

export default withStyles(styles)(Footer);