import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';

const columns = [
    {
        field: 'isPinned',
        headerName: 'Pinning',
        width: 130,
        type: 'boolean',
        // Use a valueGetter to determine what is displayed based on the isPinned property
        valueGetter: (params) => params.row.isPinned,
        // Optionally, use a cell renderer to customize the display of the pinning status
        renderCell: (params) => params.value ? 'Pinned' : 'Not Pinned',
    },
    { field: 'index_name', headerName: 'Name', width: 200 },
    { field: 'cid', headerName: 'CID', width: 330 },
    { field: 'name', headerName: 'IPFS Path', width: 150 },
    { field: 'size', headerName: 'Size', width: 130, type: 'number' },
    { field: 'cumulative_size', headerName: 'Total Size', width: 180, type: 'number' }
];

export default function IndexTable() {
    const [rows, setRows] = useState([]);
    const [selectionModel, setSelectionModel] = useState([]); // State to keep track of selected (checked) rows

    useEffect(() => {
        const directory = '/memesrc/index';
        const electron = window.require('electron');
        electron.ipcRenderer.invoke('list-directory-contents', directory)
            .then(async items => {
                const formattedRows = await Promise.all(items.map(async (item, index) => {
                    const title = await fetchTitle(item);
                    const isPinned = await checkPinStatus(item.cid); // Check pin status for each item
                    return {
                        id: index,
                        index_name: title, // Directly use the title or '(missing)'
                        name: item.name,
                        cid: item.cid,
                        size: parseInt(item.size, 10),
                        cumulative_size: parseInt(item.cumulative_size, 10),
                        isPinned, // Add the pin status to each row
                    };
                }));

                setRows(formattedRows);
                // Update selection model based on pin status
                const pinnedItems = formattedRows.filter(row => row.isPinned).map(row => row.cid);
                setSelectionModel(pinnedItems);
            })
            .catch(error => {
                console.error('Failed to list directory contents:', error);
            });
    }, []);

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
            console.log(`Failed to check pin status for CID ${cid}:`);
            return result.success && result.isPinned;
        } catch (error) {
            console.error(`Failed to check pin status for CID ${cid}:`, error);
            return false; // Assume not pinned in case of error
        }
    };

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
}
