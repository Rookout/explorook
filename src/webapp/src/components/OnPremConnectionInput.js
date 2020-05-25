import React, {useEffect, useState} from "react";
import {ipcRenderer} from "electron";
import * as Store from "electron-store";
import {connectionStates, OnPremSourceInput, TestConnectionButton} from "./OnPremConnectionInput.style";

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

    return <>
        <OnPremSourceInput
            label={label}
            value={connectionString}
            setValue={e => setConnectionString(e.currentTarget.value)}
        />
        <TestConnectionButton
            onTestConnection={() => onTestConnection(connectionString)}
            connectionState={connectionState}
        />
    </>
}