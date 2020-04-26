import React, {useEffect, useState} from "react";
import * as Store from "electron-store";
import {Button, TextField} from "@material-ui/core";
import {ipcRenderer, IpcRendererEvent} from "electron";

const connectionStates = {
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
};

export const PerforceConnection = () => {
    const [connectionString, setConnectionString] = useState('');
    const [connectionState, setConnectionState] = useState(connectionStates.PENDING);

    useEffect(() => {
        ipcRenderer.on("test-perforce-connection-result", (e, isSuccess) => {
            setConnectionState(isSuccess ? connectionStates.SUCCESS : connectionStates.ERROR)
        })
    }, []);

    useEffect(() => {
        const store = new Store({ name: "explorook" });
        const storeConnectionString = store.get("PerforceConnectionString", '');
        setConnectionString(storeConnectionString);
    }, []);

    const onTestConnection = () => {
        ipcRenderer.sendTo(window.indexWorkerId,"test-perforce-connection", connectionString)
    };

    const getCurrentColor = () => {
        switch (connectionState) {
            case connectionStates.SUCCESS:
                return "green";
            case connectionStates.ERROR:
                return "red";
            default:
                return "";
        }
    };

    return (<>
        <TextField
            id="perforce-connection-input"
            label="Perforce Connection String (P4PORT)"
            style={{width:"70%", color: "white"}}
            value={connectionString}
            onChange={e => setConnectionString(e.currentTarget.value)} />
        <Button id="test-connection-btn" variant="contained" onClick={onTestConnection} style={{backgroundColor:getCurrentColor()}}>Test Connection</Button>
        </>)
};