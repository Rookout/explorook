import React, {useEffect, useState} from "react";
import * as Store from "electron-store";
import {Button, ExpansionPanelSummary, TextField} from "@material-ui/core";
import {ipcRenderer, IpcRendererEvent} from "electron";
import ExpansionPanelDetails from "@material-ui/core/ExpansionPanelDetails";
import ExpansionPanel from "@material-ui/core/ExpansionPanel";
import {ExpandMore as ExpandMoreIcon, Check as CheckIcon, Clear as ClearIcon} from "@material-ui/icons";
import {OnPremConnectionInput, OnPremTypes} from "./OnPremConnectionInput";

export const OnPremConnection = () => {
    // Expand this panel by default only if this is the first time the user opened this app
    const store = new Store({ name: "explorook" });
    const storeIsFirstTimeOpen = store.get(`isFirstTimeOpen`) ?? true;
    if(storeIsFirstTimeOpen) {
        store.set('isFirstTimeOpen', false);
    }
    const [expanded, setExpanded] = useState(storeIsFirstTimeOpen);

    return (
        <ExpansionPanel style={{width: "99%", backgroundColor:"transparent", boxShadow:"none", padding:"0"}} expanded={expanded}
                        onChange={() => setExpanded(e => !e)}>
            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon style={{color: "#B6C8D4"}} />} style={{padding:"0"}}>
                <p className="gray-shaded">On-Prem Source Control</p>
            </ExpansionPanelSummary>
            <ExpansionPanelDetails style={{padding:"0"}}>
                <div>
                    <OnPremConnectionInput type={OnPremTypes.PERFORCE} label="Perforce Connection String (P4PORT)"/>
                </div>
            </ExpansionPanelDetails>
        </ExpansionPanel>
        )
};