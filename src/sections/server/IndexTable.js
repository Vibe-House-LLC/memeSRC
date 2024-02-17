import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';

// Function to fetch the title for a given item
const fetchTitle = async (item) => {
    const url = `https://ipfs.memesrc.com/ipfs/${item.cid}/00_metadata.json`;
    try {
        const response = await fetch(url);
        const metadata = await response.json();
        return metadata.title || '(missing)'; // Check for 'title', return '(missing)' if not found
    } catch (error) {
        console.error('Failed to fetch title:', error);
        return '(missing)'; // Return '(missing)' in case of any error
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
        return false; // Assume not pinned in case of error
    }
};

// Styled button for pinning actions with dynamic styling based on pin status
const PinningButton = styled(Button)(({ theme, pinned }) => ({
    width: '100px', // Ensure consistent width
    height: '32px',
    fontSize: '0.75rem',
    textTransform: 'none',
    color: theme.palette.getContrastText(pinned ? theme.palette.success.main : theme.palette.grey[500]),
    backgroundColor: pinned ? theme.palette.success.main : theme.palette.grey[500], // Use grey for unpinned
    opacity: pinned ? 1 : 0.75, // Adjust opacity for unpinned if needed
    '&:hover': {
        backgroundColor: pinned ? theme.palette.success.dark : theme.palette.grey[700], // Darker grey on hover for unpinned
    },
}));


const IndexTable = () => {
    const [rows, setRows] = useState([]);

    useEffect(() => {
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

    // Toggle pin status
    const togglePin = async (rowId, shouldPin) => {
        const row = rows.find(row => row.id === rowId);
        if (!row) return;

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
                    onClick={(event) => {
                        event.stopPropagation(); // Prevent click from reaching the row
                        togglePin(params.row.id, !params.value);
                    }}>
                    {params.value ? 'Pinned' : 'Pin'}
                </PinningButton>
            ),
        },
        { field: 'index_name', headerName: 'Name', width: 200 },
        { field: 'cid', headerName: 'CID', width: 330 },
        { field: 'name', headerName: 'IPFS Path', width: 150 },
        { field: 'size', headerName: 'Size', width: 130, type: 'number' },
        { field: 'cumulative_size', headerName: 'Total Size', width: 180, type: 'number' },
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
