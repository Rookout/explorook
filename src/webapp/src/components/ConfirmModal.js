import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  DialogContentText,
  Button,
  FormControlLabel,
  withStyles } from "@material-ui/core";
import Checkbox from "./Checkbox";
import * as Store from "electron-store";

const style = {
    checkBoxLabel: {
        color: "#B6C8D4",
    },
};

export const ConfirmModal = ({ body, title, open, onClose, classes, onCancel, onAgree, ...props }) => {
    const [askAgainChecked, setAskAgainChecked] = useState(false);
    const [store, _] = useState(new Store({ name: "explorook"}));

    useEffect(() => {
      store.set("non-git-dialog-never-ask-again", askAgainChecked);
    }, [setAskAgainChecked]);

    return (
       <Dialog
            PaperProps={{
                style: {backgroundColor: "#3F4758", color: "white"}
            }}
            open={open}
            onClose={onClose}
            fullWidth>
            <DialogTitle id="alert-dialog-title" style={{paddingBottom: 0}}>
            <p className="gray-shaded" style={{ margin: 0 }}>{title}</p>
            <hr className="Header-line" />
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {body}
                </DialogContentText>
            </DialogContent>
            <DialogActions style={{ display: "flex" }}>
                <FormControlLabel
                classes={{ label: classes.checkBoxLabel }}
                style={{ marginRight: "auto", marginLeft: 10 }}
                control={<Checkbox checked={askAgainChecked} onChange={(e, checked) => {
                      setAskAgainChecked(checked);
                }} />}
                label="Never ask again" />
                <Button onClick={onCancel} style={{ color: "#B6C8D4" }}>
                Cancel
                </Button>
                <Button onClick={onAgree} style={{ color: "#955FF8" }} autoFocus>
                OK
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export const Confirm = withStyles(style)(ConfirmModal);
