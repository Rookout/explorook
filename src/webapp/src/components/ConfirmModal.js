import React from 'react';
import { IconButton, Dialog, DialogContent, DialogActions, DialogTitle, DialogContentText, Button, FormControlLabel, withStyles } from '@material-ui/core';
import Checkbox from './Checkbox';
import * as Store from "electron-store";

const style = {
    checkBoxLabel: {
        color: "#B6C8D4"
    }
}
class ConfirmModal extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            askAgainChecked: false
        }
        this.store = new Store({ name: "explorook"});
    }

    render () {
        const { body, title, open, onClose, classes, onCancel, onAgree } = this.props;
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
                    control={<Checkbox checked={this.state.askAgainChecked} onChange={(e, checked) => {
                        this.setState({ askAgainChecked: checked }, () => {
                            this.store.set("non-git-dialog-never-ask-again", checked)
                        })
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
        )
    }
}

export const Confirm = withStyles(style)(ConfirmModal)