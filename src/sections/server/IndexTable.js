import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';

const columns = [
    {
        field: 'name',
        headerName: 'Name',
        width: 150,
        editable: false,
    },
    { field: 'id', headerName: 'CID', width: 530 },
];

export default function IndexTable() {
    const [rows, setRows] = useState([]);

    useEffect(() => {
        // Define the directory you want to list contents from
        const directory = '/memesrc/index'; // Adjust this path as necessary

        // Use ipcRenderer to invoke the 'list-directory-contents' channel with the directory path
        const electron = window.require('electron');
        electron.ipcRenderer.invoke('list-directory-contents', directory)
            .then(items => {
                // Assuming each item is an object with `name` and `cid` properties
                const formattedRows = items.map((item, index) => ({
                    id: item, // Assuming `item` itself is the CID or identifier; adjust as needed
                    name: `Item ${index + 1}`, // Customize this as per your actual data structure
                }));
                setRows(formattedRows);
            })
            .catch(error => {
                console.error('Failed to list directory contents:', error);
            });
    }, []);

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
