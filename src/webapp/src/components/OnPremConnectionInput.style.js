import {Button, TextField} from "@material-ui/core";
import React from "react";

export const connectionStates = {
    NOT_TESTED: 'NOT_TESTED',
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
};

export const OnPremSourceInput = ({label, value, setValue, ...props}) => (<TextField
    label={label}
    style={{width:"400px", color: "#B6C8D4"}}
    value={value}
    onChange={setValue}
    InputProps={{className: 'on-prem-input'}}
    InputLabelProps={{style: {color: "#B6C8D4"}}}
    {...props}
/>);

const getTestConnectionButtonContent = (connectionState) => {
    switch (connectionState) {
        case connectionStates.SUCCESS:
            return "Connected";
        case connectionStates.ERROR:
            return "Failed";
        case connectionStates.PENDING:
            return "Testing..."
        default:
            return "Test";
    }
}

const getTestConnectionButtonColor = (connectionState) => {
    switch (connectionState) {
        case connectionStates.SUCCESS:
            return "green";
        case connectionStates.ERROR:
            return "red";
        default:
            return "#586C7A";
    }
}

export const TestConnectionButton = ({onTestConnection, connectionState, ...props}) => (
    <Button
        size="small"
        style={{
            padding: 0,
            marginLeft: "20px",
            backgroundColor: getTestConnectionButtonColor(connectionState),
            color: "white",
            borderRadius: "30px",
            boxShadow: "none",
            width: "111px",
            height: "25px"
        }}
        variant="contained"
        onClick={onTestConnection}
        {...props}
    >
        {getTestConnectionButtonContent(connectionState)}
    </Button>
);