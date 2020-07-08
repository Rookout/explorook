import RadioGroup from "@material-ui/core/RadioGroup";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Radio from "@material-ui/core/Radio";
import {Title} from "./OnPremConnectionInput.style";
import React, {useEffect, useState} from "react";

export const GitProtocolPicker = ({store}) => {
    const [gitProtocol, setGitProtocol] = useState(store.get("gitProtocol") ?? "0");

    useEffect(() => {
        store.set("gitProtocol", gitProtocol)
    }, [gitProtocol])


    return (<RadioGroup row name="git-protocol" defaultValue="0" onChange={e => setGitProtocol(e.currentTarget.value)} value={gitProtocol}>
        <FormControlLabel
            value="0"
            control={<Radio color="primary" />}
            label={<Title label="None"/>}
        />
        <FormControlLabel
            value="1"
            control={<Radio color="primary" />}
            label={<Title label="Https"/>}
        />
        <FormControlLabel
            value="2"
            control={<Radio color="primary" />}
            label={<Title label="SSH"/>}
        />
    </RadioGroup>)
}