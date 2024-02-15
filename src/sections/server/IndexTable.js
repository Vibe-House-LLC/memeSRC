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

const rows = [
  { id: 'QmZeUBNGwD54fSpxgckZ6vQuro5Ck4sLEUkdqXvnZh9o6a', name: 'Back to the Future' },
  { id: 'QmQ8P8oZZQwQENa5hkx7SqfXmTU4nneTN7HnfAkLmTPV1j', name: 'The Matrix' },
  { id: 'QmXU8CjhDXxQMLkmoYZYj5HgocPkBQbWURXcAKB3fKy91x', name: 'Seinfeld' },
  { id: 'QmZEZd7ByQDuuZVJZgE9LwVEUJoPHfh7kxNWQGS1rpwdS8', name: 'Shallow Hal' },
];

export default function IndexTable() {
  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: {
              pageSize: 5,
            },
          },
        }}
        pageSizeOptions={[5]}
        checkboxSelection
        disableRowSelectionOnClick
        autoHeight
      />
    </Box>
  );
}