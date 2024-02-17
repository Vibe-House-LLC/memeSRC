import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';

const LOADING_STATE_KEY_PREFIX = 'pin_button_loading_state_';

// Function to fetch the title for a given item
const fetchTitle = async (item) => {
    const url = `https://ipfs.memesrc.com/ipfs/${item.cid}/00_metadata.json`;
    try {
        const response = await fetch(url);
        const metadata = await response.json();
        return metadata.title || '(missing)';
    } catch (error) {
        console.error('Failed to fetch title:', error);
        return '(missing)';
    }
};

// Function to check the pin status of an item
const checkPinStatus = async (cid) => {
    const electron = window.require('electron');
    try {
        const result = await electron.ipcRenderer.invoke('check-pin-status', cid);
        return result.success && result.isPinned;
    } catch (error) {
        console.error(`Failed to check pin status for CID ${cid}:`, error);
        return false;
    }
};

const PinningButton = styled(Button, {
    shouldForwardProp: (prop) => prop !== 'pinned',
})(({ theme, pinned }) => ({
    width: '100px',
    height: '32px',
    fontSize: '0.75rem',
    textTransform: 'none',
    color: theme.palette.getContrastText(pinned ? theme.palette.success.main : theme.palette.grey[500]),
    backgroundColor: pinned ? theme.palette.success.main : theme.palette.grey[500],
    opacity: pinned ? 1 : 0.75,
    '&:hover': {
        backgroundColor: pinned ? theme.palette.success.dark : theme.palette.grey[700],
    },
}));

const IndexTable = () => {
    const [rows, setRows] = useState([]);
    const [loadingStates, setLoadingStates] = useState({});

    useEffect(() => {
        // Load loading states from sessionStorage
        const storedLoadingStates = {};
        for (let i = 0; i < sessionStorage.length; i+=1) {
            const key = sessionStorage.key(i);
            if (key.startsWith(LOADING_STATE_KEY_PREFIX)) {
                storedLoadingStates[key.substring(LOADING_STATE_KEY_PREFIX.length)] = true;
            }
        }
        setLoadingStates(storedLoadingStates);

        // Fetch items and update rows
        const directory = '/memesrc/index';
        const electron = window.require('electron');
        electron.ipcRenderer.invoke('list-directory-contents', directory)
            .then(async items => {
                const formattedRows = await Promise.all(items.map(async (item, index) => {
                    const title = await fetchTitle(item);
                    const isPinned = await checkPinStatus(item.cid);
                    return {
                        id: index,
                        index_name: title,
                        name: item.name,
                        cid: item.cid,
                        size: parseInt(item.size, 10),
                        cumulative_size: parseInt(item.cumulative_size, 10),
                        isPinned,
                    };
                }));

                setRows(formattedRows);
            })
            .catch(error => {
                console.error('Failed to list directory contents:', error);
            });
    }, []);

    const togglePin = async (rowId, shouldPin) => {
        const row = rows.find(row => row.id === rowId);
        if (!row) return;

        // Set loading state
        setLoadingStates(prevLoadingStates => ({
            ...prevLoadingStates,
            [rowId]: true,
        }));
        sessionStorage.setItem(LOADING_STATE_KEY_PREFIX + rowId, true);

        const electron = window.require('electron');
        const action = shouldPin ? 'pin-item' : 'unpin-item';
        const result = await electron.ipcRenderer.invoke(action, row.cid);

        if (result.success) {
            const updatedRows = rows.map(r => r.id === rowId ? { ...r, isPinned: shouldPin } : r);
            setRows(updatedRows);
            console.log(`${shouldPin ? 'Pinned' : 'Unpinned'} CID ${row.cid}`);
        } else {
            console.error(`Failed to ${shouldPin ? 'pin' : 'unpin'} CID ${row.cid}:`, result.message);
        }

        // Clear loading state
        setLoadingStates(prevLoadingStates => {
            const nextState = { ...prevLoadingStates };
            delete nextState[rowId];
            sessionStorage.removeItem(LOADING_STATE_KEY_PREFIX + rowId);
            return nextState;
        });
    };

    const columns = [
        {
            field: 'isPinned',
            headerName: 'Pinning',
            width: 130,
            type: 'boolean',
            renderCell: (params) => (
                <PinningButton
                    variant="contained"
                    pinned={params.value}
                    disabled={loadingStates[params.row.id]}
                    onClick={(event) => {
                        event.stopPropagation();
                        togglePin(params.row.id, !params.value);
                    }}>
                    {loadingStates[params.row.id] ? 'Loading...' : params.value ? 'Pinned' : 'Pin'}
                </PinningButton>
            ),
        },
        { field: 'index_name', headerName: 'Name', width: 200 },
        { field: 'cid', headerName: 'CID', width: 330 },
        { field: 'name', headerName: 'IPFS Path', width: 150 },
        { field: 'size', headerName: 'Size', width: 130, type: 'string' },
        { field: 'cumulative_size', headerName: 'Total Size', width: 180, type: 'string' },
    ];

    return (
        <Box sx={{ width: '100%' }}>
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={5}
                rowsPerPageOptions={[5]}
                checkboxSelection
                disableSelectionOnClick
                autoHeight
            />
        </Box>
    );
};

export default IndexTable;
