import { useEffect, useState } from 'react';
import { Box, Typography, TextField, Button, List, ListItem, ListItemText, Stack, Card, Chip, Divider } from '@mui/material';
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
    const itemsPerPage = 10;

    // Placeholder function for loading users
    const loadUsers = async () => {
        API.graphql({
            query: listUserDetails,
            variables: {
                limit: 10
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

    // Placeholder function for loading more users
    const loadMoreUsers = async () => {
        setIsLoadingMore(true)
        API.graphql({
            query: listUserDetails,
            variables: {
                limit: 10,
                nextToken
            }
        }).then(response => {
            setUsers(prevUsers => [...prevUsers, ...response?.data?.listUserDetails?.items])
            setNextToken(response?.data?.listUserDetails.nextToken || null)
            setIsLoadingMore(false)
        }).catch(error => {
            alert('Something went wrong loading users')
            console.log(error)
        })
    };

    // Placeholder function for loading all users
    const loadAllUsers = async () => {
        setIsLoadingAll(true);
        try {
            let allUsers = [];
            let currentNextToken = null;

            const fetchUsers = async () => {
                const response = await API.graphql({
                    query: listUserDetails,
                    variables: {
                        limit: 100,
                        nextToken: currentNextToken,
                    },
                });

                const fetchedUsers = response?.data?.listUserDetails?.items || [];
                allUsers = [...allUsers, ...fetchedUsers];
                currentNextToken = response?.data?.listUserDetails?.nextToken || null;

                if (currentNextToken) {
                    await fetchUsers();
                }
            };

            await fetchUsers();
            setUsers(allUsers);
            setNextToken(null);
        } catch (error) {
            alert('Something went wrong loading users');
            console.log(error);
        }
        setIsLoadingAll(false);
    };

    // Function to handle search input change
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setCurrentPage(1);
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
        const searchTermLower = searchTerm.toLowerCase();
        return (
            username.toLowerCase().includes(searchTermLower) ||
            email.toLowerCase().includes(searchTermLower)
        );
    });

    // Get the users for the current page
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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
                    fullWidth
                    sx={{ maxWidth: 400 }}
                />
                <LoadingButton disabled={!nextToken || isLoadingAll} loading={isLoadingAll} variant="contained" onClick={loadAllUsers} style={{ marginLeft: '16px' }}>
                    Load All Users
                </LoadingButton>
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