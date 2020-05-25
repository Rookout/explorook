import {Button, TextField} from "@material-ui/core";
import React, {useEffect, useState} from "react";
import {ipcRenderer} from "electron";
import * as Store from "electron-store";
import {Check as CheckIcon, Clear as ClearIcon} from "@material-ui/icons";

const connectionStates = {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
};

export const OnPremTypes = {
    GIT: "git",
    PERFORCE: "perforce"
}

export const OnPremConnectionInput = ({type, label}) => {
    const [connectionString, setConnectionString] = useState('');
    const [connectionState, setConnectionState] = useState(connectionStates.PENDING);

    useEffect(() => {
        ipcRenderer.on(`test-${type}-connection-result`, (e, isSuccess) => {
            setConnectionState(isSuccess ? connectionStates.SUCCESS : connectionStates.ERROR)
        })
    }, []);

    useEffect(() => {
        const store = new Store({ name: "explorook" });
        const camelCaseType = type.charAt(0).toUpperCase() + type.slice(1);
        const storeConnectionString = store.get(`${camelCaseType}ConnectionString`, '');
        if(storeConnectionString) {
            onTestConnection(storeConnectionString);
        }
        setConnectionString(storeConnectionString);
    }, []);

    const onTestConnection = (stringToTest) => {
        ipcRenderer.sendTo(window.indexWorkerId,`test-${type}-connection`, stringToTest)
    };

    const getTestConnectionButtonContent = () => {
        switch (connectionState) {
            case connectionStates.SUCCESS:
                return <CheckIcon style={{fontSize:'18px'}}/>;
            case connectionStates.ERROR:
                return <ClearIcon style={{fontSize:'18px'}}/>;
            default:
                return "Test";
        }
    }

    return <>
        <TextField
            label={label}
            style={{width:"400px", color: "#B6C8D4"}}
            value={connectionString}
            onChange={e => setConnectionString(e.currentTarget.value)}
            InputProps={{className: 'on-prem-input'}}
            InputLabelProps={{style: {color: "#B6C8D4"}}}
        />
        <Button size="small" style={{
            padding: 0,
            marginLeft: "20px",
            backgroundColor: "#586C7A",
            color: "white",
            borderRadius: "30px",
            boxShadow: "none",
            width: "111px",
            height: "25px"
        }} variant="contained" onClick={() => onTestConnection(connectionString)}>
            {getTestConnectionButtonContent()}
        </Button>
    </>
}