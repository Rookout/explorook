import React from 'react';
import PropTypes from 'prop-types';
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import green from '@material-ui/core/colors/green';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
require = window.require;
const { ipcRenderer } = require('electron');

const styles = {
    disagreeButton: {
        border: '1px solid #9962FF',
        borderRadius: '17.5px',
        color: '#9962FF'
    },
    agreeButton: {
        backgroundColor: '#9962FF',
        borderRadius: '17.5px',
        color: '#fff',
        '&:hover': {
            backgroundColor: '#AE83FF'
        }
    },
    agreeButtonDisabled: {
        backgroundColor: '#CAB4F3'
    },
    checkboxDefault: {},
    checkboxChecked: {},
    root: {
        color: '#9962FF !important',
        '&$checked': {
            color: '#9962FF !important',
        },
    }
};

class EulaModal extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isConfirmChecked: false,
            show: ipcRenderer.sendSync("is-first-launch")
        };
    }

    toggleConfirm = () => {
        this.setState({ isConfirmChecked: !this.state.isConfirmChecked });
    };

    handleUserConfirmation = () => {
        this.setState({ show: false })
    };

    render() {
        return (
            <Modal
                aria-labelledby="simple-modal-title"
                aria-describedby="simple-modal-description"
                open={this.state.show}
                onClose={() => { }}>
                <div className="eula-modal">
                    <h1 className="headline">Software-as-a-Service Agreement</h1>

                    <iframe
                        className="eula-iframe"
                        title="TOS"
                        src="https://app.rookout.com/static/rookout/tos/tos-1.0.html"
                        frameBorder="0"
                    />

                    <FormControlLabel
                        className="confirmation-checkbox"
                        control={
                            <Checkbox
                                classes={{
                                    root: this.props.classes.root,
                                    checked: this.props.classes.checkboxChecked,
                                }}
                                checked={this.state.isConfirmChecked}
                                onChange={this.toggleConfirm}
                                value="confirm"
                            />
                        }
                        label="I confirm that I have read and agree to the User Agreement and Privacy policy."
                    />
                    <div className="actions">
                        <Button
                            classes={{
                                root: this.props.classes.disagreeButton
                            }}
                            variant="flat"
                            className="button disagree">I Do not agree</Button>

                        <Button
                            classes={{
                                root: this.props.classes.agreeButton,
                                disabled: this.props.classes.agreeButtonDisabled
                            }}
                            variant="flat"
                            className="button agree"
                            onClick={this.handleUserConfirmation}
                            disabled={!this.state.isConfirmChecked}>Agree</Button>
                    </div>
                </div>
            </Modal>
        );
    }
}

export default withStyles(styles)(EulaModal);