import { Helmet } from 'react-helmet-async';
import { filter } from 'lodash';
import { sentenceCase } from 'change-case';
import { useContext, useEffect, useState } from 'react';
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
import { Auth, API, graphqlOperation } from 'aws-amplify';
// components
import { Delete, Edit, Upload } from '@mui/icons-material';
import Label from '../components/label';
import Iconify from '../components/iconify';
import Scrollbar from '../components/scrollbar';
// sections
import { UserListHead, UserListToolbar } from '../sections/@dashboard/user';
import UserCountChart from '../sections/@dashboard/app/UserSignupsGraph';
// graphql
import { listUserDetails } from '../graphql/queries';
import { updateUserDetails } from '../graphql/mutations';
import { SnackbarContext } from '../SnackbarContext';
// mock
// import USERLIST from '../_mock/user';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'username', label: 'Name', alignRight: false },
  { id: 'email', label: 'Email', alignRight: false },
  { id: 'id', label: 'id', alignRight: false },
  { id: 'earlyAccessStatus', label: 'Early Access', alignRight: false },
  { id: 'contributorAccessStatus', label: 'Contributor Access', alignRight: false },
  { id: 'status', label: 'Status', alignRight: false },
  { id: 'credits', label: 'Credits', alignRight: false },
  { id: 'createdAt', label: 'Created', alignRight: false },
  { id: '' },
];

// ----------------------------------------------------------------------

function descendingComparator(a, b, orderBy) {
  if (orderBy === 'created') {
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

async function listUserDetailsGraphQL(limit, nextToken = null, result = []) {
  const userDetailsQuery = { limit, nextToken };

  const response = await API.graphql({
    query: listUserDetails,
    variables: userDetailsQuery,
    authMode: 'AMAZON_COGNITO_USER_POOLS',
  });

  const items = response.data.listUserDetails.items;
  result.push(...items);

  if (response.data.listUserDetails.nextToken) {
    return listUserDetailsGraphQL(limit, response.data.listUserDetails.nextToken, result);
    // eslint-disable-next-line no-else-return
  } else {
    return result;
  }
}

async function disableUser(username) {
  const apiName = 'AdminQueries';
  const path = '/disableUser';
  const myInit = {
    body: {
      "username": username
    },
    headers: {
      'Content-Type': 'application/json',
      Authorization: `${(await Auth.currentSession()).getAccessToken().getJwtToken()}`
    }
  }
  return API.post(apiName, path, myInit);
}

async function updateUserCredits(id, username, credits) {
  try {
    const userDetailsUpdate = {
      id,
      username,
      credits
    };

    const response = await API.graphql({
      query: updateUserDetails,
      variables: { input: userDetailsUpdate },
      authMode: 'AMAZON_COGNITO_USER_POOLS',
    });

    return response;

  } catch (error) {
    console.error("An error occurred while updating user credits:", error);
    return error; // return statement added here
  }
}





export default function UserPage() {
  const [menuOpen, setMenuOpen] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState('asc');
  const [selected, setSelected] = useState([]);
  const [orderBy, setOrderBy] = useState('name');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [userList, setUserList] = useState([]);
  const [chosenUser, setChosenUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const { setOpen, setMessage, setSeverity } = useContext(SnackbarContext)

  useEffect(() => {
    listUserDetailsGraphQL(50).then((users) => {
      setUserList(users.map(user => ({
        username: user.username,
        email: user.email,
        id: user.id,
        earlyAccessStatus: Boolean(user.earlyAccessStatus),
        contributorAccessStatus: user.contributorAccessStatus,
        status: user.status,
        enabled: true,
        credits: parseInt(user.credits, 10) || 0,
        createdAt: new Date(user.createdAt).toLocaleString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: '2-digit',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true,
        }).replace(',', ''),
      })))
    }).catch((err) => {
      console.log(err);
      setUserList([]);
    });

    // setUserList(listUsers(20));

  }, [])

  const handleOpenMenu = (event, index) => {
    setSelectedIndex(index);
    setMenuOpen(event.currentTarget);
  };

  useEffect(() => {
    console.log(selectedIndex)
  }, [selectedIndex])

  const handleCloseMenu = () => {
    setMenuOpen(null);
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  useEffect(() => {
    handleRequestSort('', 'name')
  }, [userList])

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = filteredUsers.map((n) => n.username);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event, username) => {
    const selectedIndex = selected.indexOf(username);
    let newSelected = [];
    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, username);
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

  const emptyRows = page > 0 ? Math.max(0, (1 + page) * rowsPerPage - userList.length) : 0;

  const filteredUsers = applySortFilter(userList, getComparator(order, orderBy), filterName);

  const isNotFound = !filteredUsers.length && !!filterName;

  const makeContributor = async (userObj) => {
    console.log(userObj)
    handleCloseMenu();
    const apiName = 'AdminQueries';
    const path = '/addUserToGroup';
    const myInit = {
      body: {
        "username": userObj.username,
        "groupname": "contributors"
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${(await Auth.currentSession()).getAccessToken().getJwtToken()}`
      }
    }
    try {
      await API.post(apiName, path, myInit);
      await API.graphql(
        graphqlOperation(updateUserDetails, { input: { id: userObj.id, contributorAccessStatus: 'approved' }})
      )
      setMessage(`${userObj.username} has been made a contributor!`)
      setSeverity('success');
      setOpen(true)
      setChosenUser(null)
    } catch {
      console.error('Something went wrong.')
      setMessage('Something went wrong.')
      setSeverity('error');
      setOpen(true)
      setChosenUser(null)
    }
  }

  return (
    <>
      <Helmet>
        <title> Users - memeSRC 2.0 </title>
      </Helmet>

      <Container>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={5}>
          <Typography variant="h4" gutterBottom>
            User
          </Typography>
          <Button variant="contained" startIcon={<Iconify icon="eva:plus-fill" />}>
            New User
          </Button>
        </Stack>

        <UserCountChart userList={userList} />

        <Card>
          <UserListToolbar numSelected={selected.length} filterName={filterName} onFilterName={handleFilterByName} />

          <Scrollbar>
            <TableContainer sx={{ minWidth: 800 }}>
              <Table>
                <UserListHead
                  order={order}
                  orderBy={orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={userList.length}
                  numSelected={selected.length}
                  onRequestSort={handleRequestSort}
                  onSelectAllClick={handleSelectAllClick}
                />
                <TableBody>
                  {filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
                    const { username, email, id, earlyAccessStatus, contributorAccessStatus, status, enabled, credits, createdAt } = row;
                    const selectedUser = selected.indexOf(username) !== -1;

                    return (
                      <TableRow hover key={id} tabIndex={-1} role="checkbox" selected={selectedUser}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedUser} onChange={(event) => handleClick(event, username)} />
                        </TableCell>

                        <TableCell component="th" scope="row" padding="none">
                          <Stack direction="row" alignItems="center" spacing={2}>
                            {/* <Avatar alt={username} src={avatarUrl} /> */}
                            <Typography variant="subtitle2" noWrap>
                              {username}
                            </Typography>
                          </Stack>
                        </TableCell>

                        <TableCell align="left">{email}</TableCell>

                        <TableCell align="left">{id}</TableCell>

                        <TableCell align="left">{(earlyAccessStatus) ? 'Requested' : 'No Response'}</TableCell>

                        <TableCell align="left">
                          <Label color={
                            contributorAccessStatus === 'approved'
                              ? 'success'
                              : contributorAccessStatus === 'requested'
                                ? 'warning'
                                : 'default'
                          }>
                            {contributorAccessStatus === 'approved'
                              ? 'Approved'
                              : contributorAccessStatus === 'requested'
                                ? 'Requested'
                                : 'No Response'}
                          </Label>
                        </TableCell>

                        <TableCell align="left">
                          <Label color={(status === "unverified") ? 'error' : 'success'}>{sentenceCase(status)}</Label>
                        </TableCell>

                        {/* <TableCell align="left">
                          <Label color={enabled ? 'success' : 'error'}>{sentenceCase(enabled ? 'Enabled' : 'Disabled')}</Label>
                        </TableCell> */}

                        <TableCell align="left">{credits}</TableCell>

                        <TableCell align="left">{createdAt}</TableCell>

                        <TableCell align="right">
                          <IconButton size="large" color="inherit" onClick={(event) => {
                            setChosenUser(row)
                            handleOpenMenu(event, index)
                            }}>
                            <Iconify icon={'eva:more-vertical-fill'} />
                          </IconButton>
                        </TableCell>
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
            count={userList.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>
      </Container>

      <Popover
        open={Boolean(menuOpen)}
        anchorEl={menuOpen}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            p: 1,
            '& .MuiMenuItem-root': {
              px: 1,
              typography: 'body2',
              borderRadius: 0.75,
            },
          },
        }}
      >

        <MenuItem
          onClick={() => {
            const credits = prompt('New credit amount?') || 0;
            updateUserCredits(filteredUsers[selectedIndex].id, filteredUsers[selectedIndex].username, Number(credits))
              .then(() => {
                listUserDetailsGraphQL().then((users) => {
                  setUserList(users.map(user => ({
                    username: user.username,
                    email: user.email,
                    id: user.id,
                    earlyAccessStatus: Boolean(user.earlyAccessStatus), // You'd need to include these in your GraphQL query
                    status: user.status,
                    enabled: true,
                    credits: parseInt(user.credits, 10) || 0,
                    createdAt: new Date(user.createdAt).toLocaleString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: '2-digit',
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: true,
                    }).replace(',', '')
                  })))
                }).catch((err) => {
                  console.log(err);
                  setUserList([]);
                });
                setMenuOpen(null); // Close the popover after updating credits
              })
              .catch((err) => {
                console.log(err);
              });
          }}

        >
          <Edit sx={{ mr: 1.5 }} />
          Credits
        </MenuItem>

        <MenuItem onClick={() => makeContributor(chosenUser)}>
          <Upload sx={{ mr: 1.5 }} />
          Make Contributor
        </MenuItem>

        {/* TODO: Make user list adapt to changes */}
        <MenuItem sx={{ color: 'error.main' }} onClick={() => disableUser(filteredUsers[selectedIndex].username)}>
          <Delete sx={{ mr: 1.5 }} />
          Disable
        </MenuItem>
      </Popover>
    </>
  );
}
