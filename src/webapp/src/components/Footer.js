import React, { Component } from 'react';
import { Close } from '@material-ui/icons';
import blueGrey from '@material-ui/core/colors/blueGrey';
import { withStyles } from '@material-ui/core/styles';
import { Checkbox, FormControlLabel, FormGroup } from "@material-ui/core";
require = window.require;
const { ipcRenderer } = require('electron');

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
            searchEnabled: false, 
        };
        ipcRenderer.on("auto-launch-is-enabled-changed", (event, isEnabled) => {
            this.setState({ autoLaunchEnabled: isEnabled })
        });
        ipcRenderer.on("search-index-enabled-changed", (event, isEnabled) => {
            this.setState({ searchEnabled: isEnabled })
        });
        ipcRenderer.send("auto-launch-is-enabled-req");
        ipcRenderer.sendTo(window.indexWorkerId, "is-search-enabled");
    }

    onAutoLaunchChecked(event) {
        ipcRenderer.send("auto-launch-set", event.target.checked);
    }

    onSearchEnableChecked(event) {
        ipcRenderer.sendTo(window.indexWorkerId, "search-index-set", event.target.checked);
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
                    <p className="gray-shaded">{this.getPlatformCheckboxText()}</p>
                    <Checkbox
                        checked={this.state.searchEnabled}
                        onChange={this.onSearchEnableChecked}
                        classes={{
                            root: classes.root,
                            checked: classes.checked,
                        }}
                    />
                    <p className="gray-shaded">Allow Search Index</p>
                </ FormGroup>
            </div>
        )
    }
}

export default withStyles(styles)(Footer);