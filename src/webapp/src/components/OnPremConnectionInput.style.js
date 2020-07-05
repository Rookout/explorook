import {Button, ExpansionPanelSummary, TextField} from "@material-ui/core";
import React from "react";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import {ExpandMore as ExpandMoreIcon} from "@material-ui/icons";
import Radio from "@material-ui/core/Radio";
import FormControlLabel from "@material-ui/core/FormControlLabel";

export const connectionStates = {
    NOT_TESTED: 'NOT_TESTED',
    PENDING: 'PENDING',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR'
};

export const OnPremSourceInput = ({label, value, setValue, ...props}) => (<TextField
    label={label}
    style={{width:"400px", color: "#B6C8D4", marginBottom:"1%"}}
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

export const OuterExpansionPanel = ({expanded, setExpanded, children}) => (
    <ExpansionPanel style={{width: "99%", backgroundColor:"transparent", boxShadow:"none", padding:"0"}} expanded={expanded}
                    onChange={() => setExpanded(e => !e)}>
        {children}
    </ExpansionPanel>
)

export const InnerExpansionPanel = ({expanded, setExpanded, children}) => (
    <ExpansionPanel style={{width: "90%", backgroundColor:"transparent", boxShadow:"none", padding:"0", marginLeft:"3%", marginTop: "-5%"}} expanded={expanded}
                    onChange={() => setExpanded(e => !e)}>
        {children}
    </ExpansionPanel>
)

export const OnPremExpansionPanelDetails = ({children}) => (<ExpansionPanelDetails style={{padding:"0"}}>{children}</ExpansionPanelDetails>)

export const Title = ({label}) => (<p className="gray-shaded">{label}</p>)