import React, { Component } from 'react';
import { Button, IconButton } from '@material-ui/core';
import { RemoveRedEye, ContentCopy } from '@material-ui/icons'
import { copyText } from '../utils'

export class Token extends Component {
    constructor(props) {
        super(props);
        this.state = {
            token: "sometoken"
        }
        this.onCopyClick = this.onCopyClick.bind(this);
    }
    onCopyClick(e) {
        copyText(this.state.token);
    }
    render() {
        return (
            <div id="token-wrapper">
                <p id="token-box">{this.state.token}<RemoveRedEye id="token-show-eye" className="small-icon" /></p>
                <Button onClick={this.onCopyClick} id="copy-token-btn" variant="contained"><ContentCopy style={{ fontSize: 20 }} />&nbsp;Copy</Button>
            </div>
        );
    }
}