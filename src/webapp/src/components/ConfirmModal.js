import React from 'react';
import { IconButton, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, Button, FormControlLabel, withStyles } from '@material-ui/core';
import Checkbox from './Checkbox';

const style = {
    checkBoxLabel: {
        color: "#B6C8D4"
    }
}

const confirm = props => {
    const { body, title } = props;
    return (
        <Dialog
            PaperProps={{
                style: {backgroundColor: "#3F4758", color: "white"}
            }}
            open={props.open}
            onClose={props.onClose}
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
                classes={{ label: props.classes.checkBoxLabel }}
                style={{ marginRight: "auto", marginLeft: 10 }}
                control={<Checkbox />}
                label="Never ask again" />
                <Button onClick={props.onCancel} style={{ color: "white" }}>
                Cancel
                </Button>
                <Button onClick={props.onAgree} style={{ color: "#955FF8" }} autoFocus>
                OK
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export const Confirm = withStyles(style)(confirm)