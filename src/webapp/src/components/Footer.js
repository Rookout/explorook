import React, { useState, useEffect } from 'react';
import blueGrey from '@material-ui/core/colors/blueGrey';
import { withStyles } from '@material-ui/core/styles';
import { Checkbox, FormGroup } from "@material-ui/core";
import { ipcRenderer } from 'electron';

const AUTO_LAUNCH_EXPLANATION = "Run Rookout's Desktop App on machine startup";

const styles = {
    root: {
        color: blueGrey[500],
        '&$checked': {
            color: blueGrey[500],
        },
    },
    checked: {},
}

export const Footer = ({ classes, ...props }) => {
    const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);
    const [exceptionManagerEnabled, setExceptionManagerEnabled] = useState(false);

    useEffect(() => {
        ipcRenderer.on("auto-launch-is-enabled-changed", (event, isEnabled) => {
            setAutoLaunchEnabled(isEnabled);
        });
        ipcRenderer.on("exception-manager-enabled-changed", (event, isEnabled) => {
            setExceptionManagerEnabled(isEnabled);
        });
        ipcRenderer.send("auto-launch-is-enabled-req");
        ipcRenderer.send("exception-manager-is-enabled-req");
    }, []);

    const onAutoLaunchChecked = event => {
        ipcRenderer.send("auto-launch-set", event.target.checked);
    };

    const onExceptionManagerEnableChecked = event => {
        ipcRenderer.send("exception-manager-enabled-set", event.target.checked);
        alert("Changes will take effect after you restart the app");
    };

    const getPlatformCheckboxText = () => {
        const dic = {
            'linux': 'Linux',
            'darwin': 'MacOS',
            'win32': 'Windows'
        };
        const pcName = dic[ipcRenderer.sendSync("get-platform")] || "PC";
        return `Start with ${pcName}`;
    };

    return (
        <div id="footer-container">
            <FormGroup row id="checkboxes-group">
                <Checkbox
                    checked={autoLaunchEnabled}
                    onChange={onAutoLaunchChecked}
                    classes={{
                        root: classes.root,
                        checked: classes.checked,
                    }}
                />
                <p title={AUTO_LAUNCH_EXPLANATION}>{getPlatformCheckboxText()}</p>
                <Checkbox
                    checked={exceptionManagerEnabled}
                    onChange={onExceptionManagerEnableChecked}
                    classes={{
                        root: classes.root,
                        checked: classes.checked,
                    }}
                />
                <p title="Allow reporting errors to our servers">Allow errors collection</p>
            </ FormGroup>
        </div>
    )
}

export default withStyles(styles)(Footer);
