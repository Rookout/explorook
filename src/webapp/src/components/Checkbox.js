import React from 'react';
import { Checkbox, withStyles } from "@material-ui/core";
import blueGrey from '@material-ui/core/colors/blueGrey';

const styles = {
    root: {
        color: blueGrey[500],
        '&$checked': {
            color: blueGrey[500],
        },
    },
    checked: {},
}

const checkbox = props => {
    const { classes, checked, onChange, ...others } = props;
    return <Checkbox
                checked={checked}
                onChange={onChange}
                classes={{
                    root: classes.root,
                    checked: classes.checked,
                }}
                {...others}
            >{props.children}</Checkbox>
}

export default withStyles(styles)(checkbox);