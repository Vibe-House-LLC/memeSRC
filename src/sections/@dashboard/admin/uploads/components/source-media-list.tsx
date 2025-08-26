
import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  TextField,
  Typography,
  Stack,
  InputAdornment,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { 
  SourceMedia, 
  ListSourceMediasResponse
} from '../types';
import SourceMediaRow from './source-media-row';

interface SourceMediaListProps {
  data: ListSourceMediasResponse | null;
  loading?: boolean;
  onViewDetails: (id: string) => void;
}

interface HeadCell {
  id: keyof SourceMedia | 'username' | 'seriesName';
  label: string;
  numeric: boolean;
  disablePadding: boolean;
}

const headCells: HeadCell[] = [
  {
    id: 'status',
    numeric: false,
    disablePadding: false,
    label: 'Status',
  },
  {
    id: 'username',
    numeric: false,
    disablePadding: false,
    label: 'Username',
  },
  {
    id: 'seriesName',
    numeric: false,
    disablePadding: false,
    label: 'Series',
  },
  {
    id: 'createdAt',
    numeric: false,
    disablePadding: false,
    label: 'Created',
  },
  {
    id: 'updatedAt',
    numeric: false,
    disablePadding: false,
    label: 'Updated',
  },
];

// Add non-sortable actions column
const actionsHeadCell = {
  id: 'actions' as const,
  numeric: false,
  disablePadding: false,
  label: 'Actions',
};



export default function AdminSourceMediaList({ data, loading = false, onViewDetails }: SourceMediaListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState<keyof SourceMedia | 'username' | 'seriesName'>('createdAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const sourceMedias = data?.listSourceMedias?.items || [];

  const filteredAndSortedData = useMemo(() => {
    let filtered = sourceMedias;

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = sourceMedias.filter((item) => {
        const username = item.user?.username?.toLowerCase() || '';
        const seriesName = item.series?.name?.toLowerCase() || '';
        const status = item.status?.toLowerCase() || '';
        const id = item.id?.toLowerCase() || '';
        
        return (
          username.includes(searchLower) ||
          seriesName.includes(searchLower) ||
          status.includes(searchLower) ||
          id.includes(searchLower)
        );
      });
    }

    // Sort data - create a copy to avoid mutating the original array
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (orderBy) {
        case 'username':
          aValue = a.user?.username || '';
          bValue = b.user?.username || '';
          break;
        case 'seriesName':
          aValue = a.series?.name || '';
          bValue = b.series?.name || '';
          break;
        case 'createdAt':
        case 'updatedAt': {
          const aDate = new Date(a[orderBy]);
          const bDate = new Date(b[orderBy]);
          aValue = Number.isNaN(aDate.getTime()) ? 0 : aDate.getTime();
          bValue = Number.isNaN(bDate.getTime()) ? 0 : bDate.getTime();
          break;
        }
        default:
          aValue = (a[orderBy] as string) || '';
          bValue = (b[orderBy] as string) || '';
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return order === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return sorted;
  }, [sourceMedias, searchTerm, orderBy, order]);

  // Get paginated data
  const paginatedData = useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredAndSortedData, page, rowsPerPage]);

  const handleRequestSort = (property: keyof SourceMedia | 'username' | 'seriesName') => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0); // Reset to first page when sorting
  };

  const createSortHandler = (property: keyof SourceMedia | 'username' | 'seriesName') => () => {
    handleRequestSort(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Reset page when search term changes
  React.useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  return (
    <Box>
      {/* Search Field */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Search by username, series, status, or ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          sx={{ maxWidth: 500 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      {/* Table */}
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer component={Paper} sx={{ p: 2 }}>
          <Table sx={{ minWidth: 750 }}>
            <TableHead>
              <TableRow>
                {headCells.map((headCell) => (
                  <TableCell
                    key={headCell.id}
                    align={headCell.numeric ? 'right' : 'left'}
                    padding={headCell.disablePadding ? 'none' : 'normal'}
                    sortDirection={orderBy === headCell.id ? order : false}
                  >
                    <TableSortLabel
                      active={orderBy === headCell.id}
                      direction={orderBy === headCell.id ? order : 'asc'}
                      onClick={createSortHandler(headCell.id)}
                    >
                      {headCell.label}
                      {orderBy === headCell.id && (
                        <Box component="span" sx={{ 
                          border: 0,
                          clip: 'rect(0 0 0 0)',
                          height: 1,
                          margin: -1,
                          overflow: 'hidden',
                          padding: 0,
                          position: 'absolute',
                          top: 20,
                          width: 1,
                        }}>
                          {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      )}
                    </TableSortLabel>
                  </TableCell>
                ))}
                {/* Actions column header - not sortable */}
                <TableCell
                  align="center"
                  padding={actionsHeadCell.disablePadding ? 'none' : 'normal'}
                >
                  {actionsHeadCell.label}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={headCells.length + 1} align="center" sx={{ py: 8 }}>
                    <CircularProgress />
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      Loading source medias...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredAndSortedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={headCells.length + 1} align="center" sx={{ py: 8 }}>
                    <Typography variant="body1" color="text.secondary">
                      {searchTerm ? 'No source medias found matching your search.' : 'No source medias available.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((sourceMedia) => (
                  <SourceMediaRow
                    key={sourceMedia.id}
                    sourceMedia={sourceMedia}
                    onViewDetails={onViewDetails}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredAndSortedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
    </Box>
  );
}