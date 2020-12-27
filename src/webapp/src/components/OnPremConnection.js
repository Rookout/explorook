import React, {useEffect, useState} from "react";
import * as Store from "electron-store";
import {ExpansionPanelSummary} from "@material-ui/core";
import {ipcRenderer} from "electron";
import {ExpandMore as ExpandMoreIcon} from "@material-ui/icons";
import {OnPremConnectionInput, OnPremTypes} from "./OnPremConnectionInput";
import {
    InnerExpansionPanel,
    OnPremExpansionPanelDetails,
    OuterExpansionPanel,
    Title
} from "./OnPremConnectionInput.style";
import {GitProtocolPicker} from "./GitProtocolPicker";

export const OnPremConnection = () => {
    // Expand this panel by default only if this is the first time the user opened this app
    const store = new Store({ name: "explorook" });
    const storeIsFirstTimeOpen = store.get(`isFirstTimeOpen`) ?? true;
    if(storeIsFirstTimeOpen) {
        store.set('isFirstTimeOpen', false);
    }
    const [expanded, setExpanded] = useState(storeIsFirstTimeOpen);
    const [perforceExpanded, setPerforceExpanded] = useState(false);
    const [gitExpanded, setGitExpanded] = useState(false);
    const [repoLoadingText, setRepoLoadingText] = useState(null);
    const [repoLoadingDotCount, setRepoLoadingDotCount] = useState(0);

    useEffect(() => {
        ipcRenderer.on('set-git-is-loading', (e, { isLoading, repo }) => {
            setRepoLoadingText(isLoading ? `Git fetching in progress: ${repo}` : null)

        })
    }, []);

    useEffect(() => {
        if(repoLoadingText) {
            setTimeout(() => {
                setRepoLoadingDotCount((repoLoadingDotCount + 1)%4);
            }, 400)
        }
    }, [repoLoadingText, repoLoadingDotCount])

    return (
      <div hidden>
        <OuterExpansionPanel expanded={expanded} setExpanded={setExpanded}>
            <ExpansionPanelSummary expandIcon={<ExpandMoreIcon style={{color: "#B6C8D4"}} />} style={{padding:"0"}}>
                <Title label="On-Prem Source Control"/>
            </ExpansionPanelSummary>
            {repoLoadingText && <p className="gray-shaded">{`${repoLoadingText}${'.'.repeat(repoLoadingDotCount)}`}</p> }
            <OnPremExpansionPanelDetails style={{padding:"0"}}>
                <div>
                <InnerExpansionPanel expanded={perforceExpanded} setExpanded={setPerforceExpanded}>
                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon style={{color: "#B6C8D4"}} />} style={{padding:"0"}}>
                        <Title label="Perforce"/>
                    </ExpansionPanelSummary>
                    <OnPremExpansionPanelDetails>
                        <div>
                        <OnPremConnectionInput
                            type={OnPremTypes.PERFORCE}
                            connectionStringLabel="Perforce Connection String (P4PORT)"
                            timeoutLabel="Timeout in milliseconds"
                            usernameLabel="Perforce Username (P4USER)"/>
                        </div>
                    </OnPremExpansionPanelDetails>
                </InnerExpansionPanel>
                <InnerExpansionPanel expanded={gitExpanded} setExpanded={setGitExpanded}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon style={{color: "#B6C8D4"}} />} style={{padding:"0"}}>
                    <Title label="Git On Prem"/>
                </ExpansionPanelSummary>
                <OnPremExpansionPanelDetails>
                    <div>
                        <OnPremConnectionInput
                            type={OnPremTypes.GIT}
                            connectionStringLabel="Git Clone URI"/>
                        <GitProtocolPicker store={store} />
                    </div>
                </OnPremExpansionPanelDetails>
            </InnerExpansionPanel>
                </div>
            </OnPremExpansionPanelDetails>
          </OuterExpansionPanel>
        </div>
        )
};