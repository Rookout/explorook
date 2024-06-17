import React, { useState, useEffect } from 'react';
import blueGrey from '@material-ui/core/colors/blueGrey';
import { withStyles } from '@material-ui/core/styles';
import { Checkbox, FormGroup } from "@material-ui/core";
import { ipcRenderer } from 'electron';

const AUTO_LAUNCH_EXPLANATION = "Run Dynatrace Live Debugging Desktop App on machine startup";

const styles = {
    root: {
        color: '#A9AAF2 !important',
        '&$checked': {
            color: '#A9AAF2 !important',
        },
    },
    checked: {},
}

export const Footer = ({ classes }) => {
    const [autoLaunchEnabled, setAutoLaunchEnabled] = useState(false);

    useEffect(() => {
        ipcRenderer.on("auto-launch-is-enabled-changed", (event, isEnabled) => {
            setAutoLaunchEnabled(isEnabled);
        });
        ipcRenderer.send("auto-launch-is-enabled-req");
    }, []);

    const onAutoLaunchChecked = event => {
        ipcRenderer.send("auto-launch-set", event.target.checked);
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
            </ FormGroup>
        </div>
    )
}

export default withStyles(styles)(Footer);
