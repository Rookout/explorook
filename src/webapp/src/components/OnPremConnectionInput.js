import React, {useEffect, useState} from "react";
import {ipcRenderer} from "electron";
import * as Store from "electron-store";
import {connectionStates, OnPremSourceInput, TestConnectionButton} from "./OnPremConnectionInput.style";

export const OnPremTypes = {
    GIT: "git",
    PERFORCE: "perforce"
}

export const OnPremConnectionInput = ({type, connectionStringLabel: connectionStringLabel, usernameLabel, timeoutLabel}) => {
    const [connectionString, setConnectionString] = useState('');
    const [connectionState, setConnectionState] = useState(connectionStates.NOT_TESTED);
    const [username, setUsername] = useState(undefined);
    const [timeout, setTimeout] = useState(5000);

    useEffect(() => {
        ipcRenderer.on(`test-${type}-connection-result`, (e, isSuccess) => {
            setConnectionState(isSuccess ? connectionStates.SUCCESS : connectionStates.ERROR)
        })
    }, []);

    useEffect(() => {
        if (type !== OnPremTypes.GIT) {
            const store = new Store({ name: "explorook" });
            const camelCaseType = type.charAt(0).toUpperCase() + type.slice(1);
            const storeConnectionString = store.get(`${camelCaseType}ConnectionString`, '');
            if(storeConnectionString) {
                onTestConnection(storeConnectionString);
            }
            setConnectionString(storeConnectionString);
        }
    }, []);

    const onTestConnection = (stringToTest) => {
        ipcRenderer.sendTo(window.indexWorkerId,`test-${type}-connection`, {connectionString, timeout, username})
        setConnectionState(connectionStates.PENDING)
    };

    return <>
        <OnPremSourceInput
            label={connectionStringLabel}
            value={connectionString}
            setValue={e => setConnectionString(e.currentTarget.value)}
        />
        <TestConnectionButton
            onTestConnection={() => onTestConnection(connectionString)}
            connectionState={connectionState}
        />
        {timeoutLabel && <OnPremSourceInput label={timeoutLabel} value={timeout} setValue={e => setTimeout(Number(e.currentTarget.value))} />}
        {usernameLabel && <OnPremSourceInput label={usernameLabel} value={username} setValue={e => setUsername(e.currentTarget.value)} />}
    </>
}