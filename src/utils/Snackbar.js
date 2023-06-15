import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import PropTypes from 'prop-types';
import { forwardRef, useEffect, useState } from 'react';
import { SnackbarContext } from '../SnackbarContext';

const Alert = forwardRef((props, ref) => 
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
);

SnackBar.propTypes = {
    children: PropTypes.element
}

export default function SnackBar({children}) {
    const [open, setOpen] = useState(false);
    const [severity, setSeverity] = useState('success');
    const [message, setMessage] = useState('');
    const [autoHideDuration, setAutoHideDuration] = useState(3000);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setAutoHideDuration(3000)
        setOpen(false);
    };

    useEffect(() => {
        if (open) {
            setAutoHideDuration(autoHideDuration + 1000);
        }
    }, [message])

    return (
        <SnackbarContext.Provider value={{ message, setMessage, open, setOpen, severity, setSeverity }}>
            {children}
            <Snackbar open={open} autoHideDuration={autoHideDuration} onClose={handleClose}>
                <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
                    {message}
                </Alert>
            </Snackbar>
        </SnackbarContext.Provider>
    );
}