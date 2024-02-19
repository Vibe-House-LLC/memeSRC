import React, { useState } from 'react';
import { TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';

function CidInput({ onImport }) {
    const [cidInput, setCidInput] = useState('');
    const [loading, setLoading] = useState(false); // State to handle loading status

    const handleCidChange = (event) => {
        setCidInput(event.target.value);
    };

    const handleImportClick = async () => {
        setLoading(true); // Start loading
        const electron = window.require('electron');
        try {
            // Call the new ipc handler 'add-cid-to-index' with the cidInput
            const result = await electron.ipcRenderer.invoke('add-cid-to-index', cidInput);
            console.log(result.message); // Log the result for debugging
            if (result.success) {
                onImport(cidInput); // Call the onImport prop if needed
            } else {
                // Handle the error case, maybe show an error message to the user
                console.error(result.message);
            }
        } catch (error) {
            console.error('Error adding CID to index:', error);
            // Handle any errors, such as showing an error message to the user
        }
        setCidInput(''); // Clear input after import
        setLoading(false); // End loading
    };

    return (
        <TextField
            sx={{ mt: 3 }}
            label="CID (Content Identifier)"
            value={cidInput}
            onChange={handleCidChange}
            fullWidth
            InputProps={{
                endAdornment: (
                    <LoadingButton
                        color="inherit"
                        onClick={handleImportClick}
                        loading={loading} // Use the LoadingButton's loading prop
                    >
                        Import
                    </LoadingButton>
                ),
            }}
        />
    );
}

export default CidInput;
