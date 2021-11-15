import React from "react";
import { Checkbox, withStyles } from "@material-ui/core";
import blueGrey from "@material-ui/core/colors/blueGrey";

const styles = {
    root: {
        color: blueGrey[500],
        "&$checked": {
            color: blueGrey[500],
        },
    },
    checked: {},
};

const checkbox = ({ classes, checked, onChange, children, ...props}) => {
    return <Checkbox
                checked={checked}
                onChange={onChange}
                classes={{
                    root: classes.root,
                    checked: classes.checked,
                }}
                {...props}
            >{children}</Checkbox>;
};

export default withStyles(styles)(checkbox);
