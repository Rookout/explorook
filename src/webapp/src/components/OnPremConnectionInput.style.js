import {Button, TextField} from "@material-ui/core";
import React from "react";
import {Check as CheckIcon, Clear as ClearIcon} from "@material-ui/icons";

export const connectionStates = {
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
            return <CheckIcon style={{fontSize:'18px'}}/>;
        case connectionStates.ERROR:
            return <ClearIcon style={{fontSize:'18px'}}/>;
        default:
            return "Test";
    }
}

export const TestConnectionButton = ({onTestConnection, connectionState, ...props}) => (
    <Button
        size="small"
        style={{
            padding: 0,
            marginLeft: "20px",
            backgroundColor: "#586C7A",
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