import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, List, Stack, Card, CircularProgress, InputAdornment } from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { API } from 'aws-amplify';
import { LoadingButton } from '@mui/lab';
import { listUserDetails } from '../../../graphql/queries';
import UserRow from './user-row';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [nextToken, setNextToken] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isLoadingAll, setIsLoadingAll] = useState(false);
    const [hasTriggeredLoadAll, setHasTriggeredLoadAll] = useState(false);
    const [isLoadingFromSearch, setIsLoadingFromSearch] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const itemsPerPage = 10;

    // Function for loading users
    const loadUsers = async () => {
        API.graphql({
            query: listUserDetails,
            variables: {
                limit: 50
            }
        }).then(response => {
            setUsers(response?.data?.listUserDetails?.items)
            setNextToken(response?.data?.listUserDetails.nextToken || null)
        }).catch(error => {
            alert('Something went wrong loading users')
            console.log(error)
        })
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Function for loading more users
    const loadMoreUsers = async () => {
        setIsLoadingMore(true)
        API.graphql({
            query: listUserDetails,
            variables: {
                limit: 50,
                nextToken
            }
        }).then(response => {
            setUsers(prevUsers => [...prevUsers, ...response?.data?.listUserDetails?.items])
            setNextToken(response?.data?.listUserDetails.nextToken || null)
            setIsLoadingMore(false)
        }).catch(error => {
            alert('Something went wrong loading users')
            console.log(error)
            setIsLoadingMore(false)
        })
    };

    // Function for loading all users
    const loadAllUsers = async (fromSearchFocus = false, options = {}) => {
        const { force = false, returnUsers = false } = options;

        if (isLoadingAll) {
            return returnUsers ? users : undefined;
        }

        if (hasTriggeredLoadAll && !fromSearchFocus && !force) {
            return returnUsers ? users : undefined;
        }

        setIsLoadingAll(true);
        if (fromSearchFocus) {
            setIsLoadingFromSearch(true);
        }

        try {
            let allUsers = [];
            let currentNextToken = null;

            do {
                const response = await API.graphql({
                    query: listUserDetails,
                    variables: {
                        nextToken: currentNextToken,
                    },
                });

                const fetchedUsers = response?.data?.listUserDetails?.items || [];
                allUsers = [...allUsers, ...fetchedUsers];
                currentNextToken = response?.data?.listUserDetails?.nextToken || null;
            } while (currentNextToken);

            setUsers(allUsers);
            setNextToken(null);
            setHasTriggeredLoadAll(true);

            return returnUsers ? allUsers : undefined;
        } catch (error) {
            alert('Something went wrong loading users');
            console.log(error);
            // Reset the flag on error so user can try again
            setHasTriggeredLoadAll(false);

            return returnUsers ? null : undefined;
        } finally {
            setIsLoadingAll(false);
            if (fromSearchFocus) {
                setIsLoadingFromSearch(false);
            }
        }
    };

    // Function to handle search input change
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1);
    };

    // Function to handle search field focus
    const handleSearchFocus = () => {
        // Only trigger loadAllUsers if we haven't already loaded all users and there are more to load
        if (!hasTriggeredLoadAll && nextToken && !isLoadingAll) {
            loadAllUsers(true);
        }
    };

    // Function to handle page change
    const handlePageChange = async (page) => {
        if (page < 1) return;

        if (page > Math.ceil(filteredUsers.length / itemsPerPage)) {
            if (nextToken) {
                setIsLoadingMore(true);
                await loadMoreUsers();
                setIsLoadingMore(false);
            } else {
                return;
            }
        }

        setCurrentPage(page);
    };

    // Function to filter users based on search term
    const filteredUsers = users.filter((user) => {
        const { username, email } = user;
        const searchTermLower = searchTerm?.toLowerCase();
        return (
            username?.toLowerCase().includes(searchTermLower) ||
            email?.toLowerCase().includes(searchTermLower)
        );
    });

    // Get the users for the current page
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const createCsvContent = (records) => {
        if (!records || records.length === 0) {
            return '';
        }

        const columnSet = new Set();
        records.forEach((record) => {
            Object.keys(record || {}).forEach((key) => columnSet.add(key));
        });

        const columns = Array.from(columnSet);
        const escapeCell = (value) => {
            if (value === null || value === undefined) {
                return '';
            }

            const cellValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            if (/[",\n]/.test(cellValue)) {
                return `"${cellValue.replace(/"/g, '""')}"`;
            }

            return cellValue;
        };

        const header = columns.map((column) => escapeCell(column)).join(',');
        const rows = records.map((record) => columns.map((column) => escapeCell(record[column])).join(','));

        return [header, ...rows].join('\n');
    };

    const handleExportCsv = async () => {
        setIsExporting(true);

        try {
            let allUsersData = users;
            if (!hasTriggeredLoadAll && nextToken) {
                const fetchedUsers = await loadAllUsers(false, { returnUsers: true });
                allUsersData = fetchedUsers || [];
            }

            if (!allUsersData || allUsersData.length === 0) {
                alert('No users available to export');
                return;
            }

            const csvContent = createCsvContent(allUsersData);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
            link.download = `users-${timestamp}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('Something went wrong exporting users');
            console.log(error);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                User List ({users?.length}{nextToken && '+'})
            </Typography>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
                <TextField
                    label="Search"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={handleSearchFocus}
                    fullWidth
                    sx={{ maxWidth: 400 }}
                    InputProps={{
                        endAdornment: isLoadingFromSearch && (
                            <InputAdornment position="end">
                                <CircularProgress size={20} />
                            </InputAdornment>
                        ),
                    }}
                />
                <Stack direction='row' spacing={2} sx={{ marginLeft: 2 }}>
                    <LoadingButton
                        disabled={!nextToken || isLoadingAll || hasTriggeredLoadAll}
                        loading={isLoadingAll}
                        variant="contained"
                        onClick={() => loadAllUsers(false)}
                    >
                        Load All Users
                    </LoadingButton>
                    <LoadingButton
                        disabled={isLoadingAll || isLoadingMore || isExporting}
                        loading={isExporting}
                        variant="contained"
                        onClick={handleExportCsv}
                    >
                        Export CSV
                    </LoadingButton>
                </Stack>
            </Stack>
            <Card
                sx={{
                    my: 2,
                    px: 2,
                    py: 0
                }}
            >
                <List>
                    {(paginatedUsers && paginatedUsers.length > 0) ? paginatedUsers.map((user, index) => (
                        <UserRow key={user.id} user={user} isLastItem={paginatedUsers.length === index + 1} />
                    ))
                        :
                        (isLoadingMore || isLoadingAll) ? (
                            <Typography fontSize={30} py={8} textAlign='center'>
                                Loading...
                            </Typography>
                        ) : (
                            <Typography fontSize={30} py={8} textAlign='center'>
                                No Users Found
                            </Typography>
                        )
                    }
                </List>
            </Card>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
                <Button
                    variant="contained"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoadingAll}
                    startIcon={<ArrowBack />}
                />
                <Typography
                    variant="body1"
                    component="span"
                >
                    Page{' '}
                    {Math.ceil(filteredUsers.length / itemsPerPage) <= 8 ? (
                        Array.from({ length: Math.ceil(filteredUsers.length / itemsPerPage) }, (_, index) => (
                            <Typography
                                key={index}
                                variant="body1"
                                component="span"
                                onClick={() => currentPage !== index + 1 && handlePageChange(index + 1)}
                                style={{
                                    cursor: currentPage === index + 1 ? 'default' : 'pointer',
                                    textDecoration: currentPage === index + 1 ? 'none' : 'underline',
                                    marginLeft: '4px',
                                    marginRight: '4px',
                                    color: currentPage === index + 1 ? 'primary.main' : 'inherit',
                                }}
                            >
                                {index + 1}
                            </Typography>
                        ))
                    ) : (
                        <>
                            {Array.from({ length: 3 }, (_, index) => (
                                <Typography
                                    key={index}
                                    variant="body1"
                                    component="span"
                                    onClick={() => currentPage !== index + 1 && handlePageChange(index + 1)}
                                    style={{
                                        cursor: currentPage === index + 1 ? 'default' : 'pointer',
                                        textDecoration: currentPage === index + 1 ? 'none' : 'underline',
                                        marginLeft: '4px',
                                        marginRight: '4px',
                                        color: currentPage === index + 1 ? 'primary.main' : 'inherit',
                                    }}
                                >
                                    {index + 1}
                                </Typography>
                            ))}
                            <Typography variant="body1" component="span" style={{ marginLeft: '4px', marginRight: '4px' }}>
                                ...
                            </Typography>
                            <Typography
                                variant="body1"
                                component="span"
                                style={{
                                    marginLeft: '4px',
                                    marginRight: '4px',
                                    color: 'primary.main',
                                }}
                            >
                                {currentPage}
                            </Typography>
                            <Typography variant="body1" component="span" style={{ marginLeft: '4px', marginRight: '4px' }}>
                                ...
                            </Typography>
                            {Array.from({ length: 3 }, (_, index) => (
                                <Typography
                                    key={index}
                                    variant="body1"
                                    component="span"
                                    onClick={() => handlePageChange(Math.ceil(filteredUsers.length / itemsPerPage) - 2 + index)}
                                    style={{
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        marginLeft: '4px',
                                        marginRight: '4px',
                                        color: 'inherit',
                                    }}
                                >
                                    {Math.ceil(filteredUsers.length / itemsPerPage) - 2 + index}
                                </Typography>
                            ))}
                        </>
                    )}
                    {nextToken ? '...' : ''}
                </Typography>
                <LoadingButton
                    loading={isLoadingMore}
                    variant="contained"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={(!nextToken && currentPage === Math.ceil(filteredUsers.length / itemsPerPage)) || isLoadingAll}
                    endIcon={<ArrowForward />}
                />
            </Stack>
        </Box>
    );
};

export default UserList;
