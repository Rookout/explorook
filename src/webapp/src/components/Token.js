import React, { useState } from "react";
import { Button } from "@material-ui/core";
import { VisibilityOff, Visibility, ContentCopy } from "@material-ui/icons";
import { copyText } from "../utils";
import { ipcRenderer } from "electron";

const hiddenToken = "****************************************";

const token = ipcRenderer.sendSync("token-request");

export const Token = ({ ...props }) => {
  const [renderToken, setRenderToken] = useState(hiddenToken);

  const onCopyClick = e => {
    copyText(token);
  };

  const onEyeClicked = e => {
    if (renderToken === hiddenToken) {
      setRenderToken(token);
    } else {
      setRenderToken(hiddenToken);
    }
  };

  return (
    <div style={{ marginLeft: "25px" }}>
      <div id="token-title" className="flex">
        <p className="gray-shaded">Access Token &nbsp;</p>
      </div>
      <div id="token-wrapper">
        <div id="token-box">
          <p style={{ marginTop: 0, paddingTop: 0, height: 'auto' }}>{renderToken}</p>
          {renderToken === hiddenToken ?
            <Visibility onClick={onEyeClicked} id="token-show-eye" className="small-icon" />
            :
            <VisibilityOff onClick={onEyeClicked} id="token-show-eye" className="small-icon" />
          }
        </div>
        <Button onClick={onCopyClick} id="copy-token-btn" variant="contained"><ContentCopy style={{ fontSize: 20 }} />&nbsp;Copy</Button>
      </div>
    </div>
  );
};
