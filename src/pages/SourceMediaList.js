import { Helmet } from 'react-helmet-async';
import { filter } from 'lodash';
import { sentenceCase } from 'change-case';
import { useEffect, useState } from 'react';
// @mui
import {
  Card,
  Table,
  Stack,
  Paper,
  Button,
  Popover,
  Checkbox,
  TableRow,
  MenuItem,
  TableBody,
  TableCell,
  Container,
  Typography,
  IconButton,
  TableContainer,
  TablePagination,
} from '@mui/material';
import { Auth, API } from 'aws-amplify';
import { useNavigate } from 'react-router-dom';
// components
import Label from '../components/label';
import Iconify from '../components/iconify';
import Scrollbar from '../components/scrollbar';
// sections
import { UserListHead, UserListToolbar } from '../sections/@dashboard/user';
import UserCountChart from '../sections/@dashboard/app/UserSignupsGraph';
// graphql
import { listSourceMedias, listUserDetails } from '../graphql/queries';
import { updateUserDetails } from '../graphql/mutations';
// mock
// import USERLIST from '../_mock/user';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'series', label: 'Series', alignRight: false },
  { id: 'id', label: 'id', alignRight: false },
  { id: 'user', label: 'User', alignRight: false },
  { id: 'status', label: 'Status', alignRight: false },
  { id: 'createdAt', label: 'Created', alignRight: false },
  { id: '' },
];

// ----------------------------------------------------------------------

function descendingComparator(a, b, orderBy) {
  if(orderBy === 'created') {
    const dateA = new Date(a[orderBy]);
    const dateB = new Date(b[orderBy]);
    if (dateB < dateA) {
      return -1;
    }
    if (dateB > dateA) {
      return 1;
    }
  } else {
    if (b[orderBy] < a[orderBy]) {
      return -1;
    }
    if (b[orderBy] > a[orderBy]) {
      return 1;
    }
  }
  return 0;
}


function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function applySortFilter(array, comparator, query) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  if (query) {
    return filter(array, (_user) => _user.username.toLowerCase().indexOf(query.toLowerCase()) !== -1);
  }
  return stabilizedThis.map((el) => el[0]);
}

async function listSourceMediasGraphQL(limit, nextToken = null, result = []) {
  const sourceMediaQuery = { limit, nextToken };

  const response = await API.graphql({
    query: listSourceMedias,
    variables: sourceMediaQuery,
    authMode: 'AMAZON_COGNITO_USER_POOLS',
  });

  const items = response.data.listSourceMedias.items;
  result.push(...items);

  if (response.data.listSourceMedias.nextToken) {
    return listSourceMediasGraphQL(limit, response.data.listSourceMedias.nextToken, result);
    // eslint-disable-next-line no-else-return
  } else {
    return result;
  }
}

function formatDateTime(dateTimeStr) {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true };
  const date = new Date(dateTimeStr);
  let formattedDate = date.toLocaleString('en-US', options);

  formattedDate = formattedDate.replace(/(\d+):(\d+)/, (match, p1, p2) => {
      const period = p1 < 12 ? 'am' : 'pm';
      const hour = p1 < 12 ? p1 : p1 - 12;
      return `${hour}:${p2}`;
  });

  return formattedDate;
}



export default function SourceMediaList() {
  const [open, setOpen] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState('asc');
  const [selected, setSelected] = useState([]);
  const [orderBy, setOrderBy] = useState('name');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sourceMedia, setSourceMedia] = useState([]);
  const [credits, setCredits] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    listSourceMediasGraphQL(50).then(result => {
      setSourceMedia(result)
    }).catch(error => console.log(error))
  }, [])

  const handleOpenMenu = (event, index) => {
    setSelectedIndex(index);
    setOpen(event.currentTarget);
  };

  useEffect(() => {
    console.log(selectedIndex)
  }, [selectedIndex])

  const handleCloseMenu = () => {
    setOpen(null);
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = filteredSourceMedia.map((n) => n.id);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }
    setSelected(newSelected);
    console.log(newSelected);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setPage(0);
    setRowsPerPage(parseInt(event.target.value, 10));
  };

  const handleFilterByName = (event) => {
    setPage(0);
    setFilterName(event.target.value);
  };

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - sourceMedia.length) : 0;

  const filteredSourceMedia = applySortFilter(sourceMedia, getComparator(order, orderBy), filterName);

  const isNotFound = !filteredSourceMedia.length && !!filterName;

  return (
    <>
      <Helmet>
        <title> Source Media - memeSRC 2.0 </title>
      </Helmet>

      <Container>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
          <Typography variant="h4" gutterBottom>
            Source Media
          </Typography>
        </Stack>

        <Card>
          <UserListToolbar numSelected={selected.length} filterName={filterName} onFilterName={handleFilterByName} />

          <Scrollbar>
            <TableContainer sx={{ minWidth: 800 }}>
              <Table>
                <UserListHead
                  order={order}
                  orderBy={orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={sourceMedia.length}
                  numSelected={selected.length}
                  onRequestSort={handleRequestSort}
                  onSelectAllClick={handleSelectAllClick}
                />
                <TableBody>
                  {filteredSourceMedia.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                    const { series, user, id, status, createdAt } = row;
                    const selectedSourceMedia = selected.indexOf(id) !== -1;

                    return (
                      <TableRow hover key={id} tabIndex={-1} role="checkbox" selected={selectedSourceMedia}>
                        <TableCell sx={{cursor: 'pointer'}} onClick={() => {navigate(`files/${id}`)}} padding="checkbox">
                          <Checkbox checked={selectedSourceMedia} onChange={(event) => handleClick(event, id)} />
                        </TableCell>

                        <TableCell sx={{cursor: 'pointer'}} onClick={() => {navigate(`files/${id}`)}} component="th" scope="row" padding="none">
                          <Stack direction="row" alignItems="center" spacing={2}>
                            {/* <Avatar alt={username} src={avatarUrl} /> */}
                            <Typography variant="subtitle2" noWrap>
                              {series.name}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell sx={{cursor: 'pointer'}} onClick={() => {navigate(`files/${id}`)}} align="left">{id}</TableCell>

                        <TableCell sx={{cursor: 'pointer'}} onClick={() => {navigate(`files/${id}`)}} align="left">{user && user.username}</TableCell>

                        <TableCell sx={{cursor: 'pointer'}} onClick={() => {navigate(`files/${id}`)}} align="left">
                          <Label color={(status === "uploaded") ? 'warning' : 'success'}>{sentenceCase(status)}</Label>
                        </TableCell>

                        <TableCell sx={{cursor: 'pointer'}} onClick={() => {navigate(`files/${id}`)}} align="left">{formatDateTime(createdAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {emptyRows > 0 && (
                    <TableRow style={{ height: 53 * emptyRows }}>
                      <TableCell colSpan={6} />
                    </TableRow>
                  )}
                </TableBody>

                {isNotFound && (
                  <TableBody>
                    <TableRow>
                      <TableCell align="center" colSpan={6} sx={{ py: 3 }}>
                        <Paper
                          sx={{
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="h6" paragraph>
                            Not found
                          </Typography>

                          <Typography variant="body2">
                            No results found for &nbsp;
                            <strong>&quot;{filterName}&quot;</strong>.
                            <br /> Try checking for typos or using complete words.
                          </Typography>
                        </Paper>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                )}
              </Table>
            </TableContainer>

          </Scrollbar>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={sourceMedia.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </Container>
    </>
  );
}
