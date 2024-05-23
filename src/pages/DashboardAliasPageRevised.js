import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Container, Divider, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress, Stack } from "@mui/material";
import { API, Storage, graphqlOperation } from 'aws-amplify';
import { Add, Edit, Delete, Refresh, StorageOutlined } from "@mui/icons-material";
import { LoadingButton } from '@mui/lab';
import { getV2ContentMetadata, listAliases, listV2ContentMetadata } from '../graphql/queries';
import { createAlias, updateAlias, deleteAlias, createV2ContentMetadata, updateV2ContentMetadata } from '../graphql/mutations';
import { SnackbarContext } from '../SnackbarContext';
import { onUpdateV2ContentMetadata } from '../graphql/subscriptions';

const useTimeout = () => {
  const timeoutRef = useRef();
  const callbackRef = useRef();

  const set = useCallback((callback, delay) => {
    callbackRef.current = callback;
    timeoutRef.current = setTimeout(() => callbackRef.current(), delay);
  }, []);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  useEffect(() => {
    return clear;
  }, [clear]);

  return { clear, set };
};

/* Utility Functions */

const fetchAllItems = async (queryOperation, itemsKey, nextToken = null, accumulator = []) => {
  const response = await API.graphql(graphqlOperation(queryOperation, { nextToken }));
  const items = response.data[itemsKey].items;
  const newNextToken = response.data[itemsKey].nextToken;

  const updatedAccumulator = [...accumulator, ...items];

  if (newNextToken) {
    return fetchAllItems(queryOperation, itemsKey, newNextToken, updatedAccumulator);
  }

  return updatedAccumulator;
};

const fetchAliases = async () => {
  try {
    return await fetchAllItems(listAliases, 'listAliases');
  } catch (error) {
    console.error("Error fetching aliases:", error);
    throw error;
  }
};

const fetchV2ContentMetadata = async () => {
  try {
    return await fetchAllItems(listV2ContentMetadata, 'listV2ContentMetadata');
  } catch (error) {
    console.error("Error fetching V2 content metadata:", error);
    throw error;
  }
};

/* Components */

const AliasFormDialog = ({ open, onClose, onSubmit, initialValues }) => {
  const [formValues, setFormValues] = useState(initialValues);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const handleSubmit = () => {
    onSubmit(formValues);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{initialValues.id ? 'Update Alias' : 'Create Alias'}</DialogTitle>
      <DialogContent>
        {!initialValues.id && ( // Show this field only when creating a new alias
          <TextField
            autoFocus
            margin="dense"
            name="id"
            label="ID"
            type="text"
            fullWidth
            variant="outlined"
            value={formValues.id || ''}
            onChange={handleChange}
          />
        )}
        <TextField
          margin="dense"
          name="aliasV2ContentMetadataId"
          label="Content Metadata ID"
          type="text"
          fullWidth
          variant="outlined"
          value={formValues.aliasV2ContentMetadataId || ''}
          onChange={handleChange}
        />
        {/* Add additional fields here as needed */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
};


const ConfirmDeleteDialog = ({ open, onClose, onConfirm }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        Are you sure you want to delete this alias?
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error">Delete</Button>
      </DialogActions>
    </Dialog>
  );
};

/* Main Component */

const AliasManagementPageRevised = () => {
  const [aliases, setAliases] = useState([]);
  const [v2ContentMetadatas, setV2ContentMetadatas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentAlias, setCurrentAlias] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshingMetadata, setRefreshingMetadata] = useState(false);
  const { setOpen: setSnackbarOpen, setMessage, setSeverity } = useContext(SnackbarContext)
  const [reindexing, setReindexing] = useState(null);
  const [reindexAll, setReindexAll] = useState(false);
  const [completedIndexes, setCompletedIndexes] = useState([]);
  const { clear, set } = useTimeout();

  // This is currently set to 5 minutes. All "timeout" functions look at this. It'd probably be best to set this to whatever the timeout on the function will be.
  const timeoutTime = 5 * 60 * 1000

  useEffect(() => {
    fetchAliases().then(data => {
      setAliases(data);
      fetchV2ContentMetadata().then(metadatas => {
        const indexingMetadata = metadatas.find(obj => obj.isIndexing);
        if (indexingMetadata) {

          // Calculate the time difference between the current time and lastIndexingStartedAt
          const lastIndexingStartedAt = new Date(indexingMetadata.lastIndexingStartedAt);
          const currentTime = new Date();
          const timeDifference = currentTime - lastIndexingStartedAt;

          // Check if the time difference is less than 5 minutes
          if (timeDifference < 5 * 60 * 1000) {

            setReindexing(indexingMetadata?.id);
            // Set a timeout to show the alert after 5 minutes
            

            let isIndexingPrevious = true;
            const indexUpdateSub = API.graphql({
              query: onUpdateV2ContentMetadata,
              variables: {
                id: indexingMetadata?.id,
              },
            }).subscribe({
              next: async ({ provider, value }) => {
                const isIndexingCurrent = value?.data?.onUpdateV2ContentMetadata?.isIndexing;

                if (isIndexingPrevious && !isIndexingCurrent) {
                  indexUpdateSub.unsubscribe();

                  setCompletedIndexes((prevCompletedIndexes) => {
                    const updatedCompletedIndexes = [...prevCompletedIndexes, indexingMetadata?.id];
                    completedIndexesRef.current = updatedCompletedIndexes;
                    return updatedCompletedIndexes;
                  });

                  if (reindexAllRef.current) {
                    const filteredIndexes = aliases.filter(
                      (obj) => !completedIndexesRef.current.includes(obj.id)
                    );

                    if (filteredIndexes.length > 0) {
                      await handleReindex(filteredIndexes[0].id);
                    } else {
                      setReindexAll(false);
                      setReindexing(null);
                      setSnackbarOpen(true)
                      setMessage(`All shows have been reindexed!`)
                      setSeverity('success')
                    }
                  } else {
                    clear();
                    setReindexing(null);
                    setSnackbarOpen(true);
                    setMessage(`${indexingMetadata?.id} has been reindexed!`)
                    setSeverity('success')
                  }
                }

                isIndexingPrevious = isIndexingCurrent;
              },
              error: (error) => console.warn(error),
            });
            setSnackbarOpen(true);
            setMessage(`${indexingMetadata?.id} did not finish indexing. Please wait.`)
            setSeverity('warning')
            set(() => {
              setSnackbarOpen(true);
              setReindexAll(false);
              setReindexing(null);
              setMessage(`Indexing for ${indexingMetadata.id} has been running for more than 5 minutes.`);
              setSeverity('error');
              indexUpdateSub.unsubscribe();
            }, timeoutTime - timeDifference);
          } else {
            setSnackbarOpen(true);
            setMessage(`Indexing for ${indexingMetadata.id} did not finish after 5 minutes.`);
            setSeverity('error');
          }
        }
        setLoading(false);
      });
    });
  }, []);

  const handleOpenDialog = (alias = null) => {
    if (alias) {
      setCurrentAlias(alias);
      setIsEditing(true); // Set to true if we are editing an existing alias
    } else {
      setCurrentAlias({}); // Reset or set to a default value for a new alias
      setIsEditing(false); // Set to false if we are adding a new alias
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentAlias(null);
    setIsEditing(false);
  };

  const handleOpenDeleteDialog = (alias) => {
    setCurrentAlias(alias);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCurrentAlias(null);
  };

  const handleDeleteAlias = async () => {
    try {
      const input = { id: currentAlias.id };
      await API.graphql(graphqlOperation(deleteAlias, { input }));
      refreshAliases();
    } catch (error) {
      console.error("Error deleting alias:", error);
    } finally {
      handleCloseDeleteDialog();
    }
  };

  const refreshAliases = () => {
    setLoading(true);
    fetchAliases().then(data => {
      setAliases(data);
      setLoading(false);
    });
  };

  const refreshMetadata = (metadataId) => {
    setRefreshingMetadata(metadataId)
    console.log(metadataId)
    Storage.get(`src/${metadataId}/00_metadata.json`, { level: 'public', download: true, customPrefix: { public: 'protected/' } }).then(response => {
      response.Body.text().then(async resultString => {
        console.log(resultString)
        const result = JSON.parse(resultString)

        const input = {
          id: metadataId,
          colorMain: result.colorMain || '#000000',
          colorSecondary: result.colorSecondary || '#FFFFFF',
          description: result.description || 'N/A',
          emoji: result.emoji || '',
          frameCount: result.frameCount || 0,
          status: 0,
          title: result.title || 'N/A',
          version: 2,
          fontFamily: result?.fontFamily || null
        }

        try {
          await API.graphql(graphqlOperation(updateV2ContentMetadata, { input }));
          setMessage(`${result.title}'s metadata has been refreshed.`)
          setSeverity('success')
          setSnackbarOpen(true)
          setRefreshingMetadata(false)
        } catch (error) {
          console.error("Error updating V2ContentMetadata: ", error);
          setMessage('Error updating V2ContentMetadata')
          setSeverity('error')
          setSnackbarOpen(true)
          setRefreshingMetadata(false)
        }

      }).catch(error => {
        console.error("Error parsing response: ", error);
        setMessage('Error parsing response')
        setSeverity('error')
        setSnackbarOpen(true)
        setRefreshingMetadata(false)
      })
    }).catch(error => {
      console.error("Error loading 00_metadata.json: ", error);
      setMessage('Error loading 00_metadata.json')
      setSeverity('error')
      setSnackbarOpen(true)
      setRefreshingMetadata(false)
    });
  }

  const handleSubmitForm = async (aliasData) => {
    try {
      const input = {
        // Define your input here as before
        id: aliasData.id,
        aliasV2ContentMetadataId: aliasData.aliasV2ContentMetadataId,
        // Add other fields as necessary
      };

      let newMetadataCreated;

      const doesMetadataExist = await API.graphql(graphqlOperation(getV2ContentMetadata, { id: aliasData.aliasV2ContentMetadataId }))
      // If the metadata doesn't exist, try to fetch it and add it.
      // If the metadata cannot be loaded, the enitire function will stop before any damage is done.
      if (!doesMetadataExist?.data?.getV2ContentMetadata?.id) {
        // Get the metadata
        Storage.get(`src/${aliasData.aliasV2ContentMetadataId}/00_metadata.json`, { level: 'public', download: true, customPrefix: { public: 'protected/' } }).then(response => {
          response.Body.text().then(async resultString => {
            console.log(resultString)
            const result = JSON.parse(resultString)

            const newMetadataDetails = {
              id: aliasData.aliasV2ContentMetadataId,
              colorMain: result.colorMain || '#000000',
              colorSecondary: result.colorSecondary || '#FFFFFF',
              description: result.description || 'N/A',
              emoji: result.emoji || '',
              frameCount: result.frameCount || 0,
              status: 0,
              title: result.title || 'N/A',
              version: 2,
              fontFamily: result?.fontFamily || null
            }

            newMetadataCreated = await API.graphql(graphqlOperation(createV2ContentMetadata, { input: { ...newMetadataDetails } }))
            console.log(newMetadataCreated)
          })
        }).catch(error => {
          console.log(error);
        });
      }

      if (isEditing) {
        await API.graphql(graphqlOperation(updateAlias, { input }));
        setMessage(`${newMetadataCreated ? 'Metadata has been created and the ' : 'The '}alias has been updated!`)
        setSeverity('success')
        setSnackbarOpen(true)
      } else {
        await API.graphql(graphqlOperation(createAlias, { input }));
        setMessage(`The alias ${newMetadataCreated ? 'and metadata have' : 'has'} been created!`)
        setSeverity('success')
        setSnackbarOpen(true)
      }
      refreshAliases();
    } catch (error) {
      console.error("Error submitting form:", error);
      setMessage('Metadata could not be fetched')
      setSeverity('error')
      setSnackbarOpen(true)
    } finally {
      handleCloseDialog();
    }
  };

  const reindexAllRef = useRef(false);
  const completedIndexesRef = useRef([]);

  useEffect(() => {
    reindexAllRef.current = reindexAll;
  }, [reindexAll]);

  useEffect(() => {
    completedIndexesRef.current = completedIndexes;
  }, [completedIndexes]);

  const handleReindex = async (indexId) => {
    setReindexing(indexId);
    clear();
    let isIndexingPrevious = true;

    const indexUpdateSub = API.graphql({
      query: onUpdateV2ContentMetadata,
      variables: {
        id: indexId,
      },
    }).subscribe({
      next: async ({ provider, value }) => {
        const isIndexingCurrent = value?.data?.onUpdateV2ContentMetadata?.isIndexing;

        if (isIndexingPrevious && !isIndexingCurrent) {
          indexUpdateSub.unsubscribe();

          setCompletedIndexes((prevCompletedIndexes) => {
            const updatedCompletedIndexes = [...prevCompletedIndexes, indexId];
            completedIndexesRef.current = updatedCompletedIndexes;
            return updatedCompletedIndexes;
          });

          if (reindexAllRef.current) {
            const filteredIndexes = aliases.filter(
              (obj) => !completedIndexesRef.current.includes(obj.id)
            );

            if (filteredIndexes.length > 0) {
              await handleReindex(filteredIndexes[0].id);
            } else {
              setReindexAll(false);
              setReindexing(null);
              setSnackbarOpen(true)
              setMessage(`All shows have been reindexed!`)
              setSeverity('success')
            }
          } else {
            clear();
            setReindexing(null);
            setSnackbarOpen(true)
            setMessage(`${indexId} has been reindexed!`)
            setSeverity('success')
          }
        }

        isIndexingPrevious = isIndexingCurrent;
      },
      error: (error) => console.warn(error),
    });

    try {

      // TODO: Comment this out when the API is ready
      // await API.graphql({
      //   query: updateV2ContentMetadata,
      //   variables: {
      //     input: {
      //       id: indexId,
      //       isIndexing: true,
      //       lastIndexingStartedAt: new Date().toISOString(),
      //     },
      //   },
      // });


      // TODO: Uncomment this when the API is ready
      await API.post('publicapi', '/openSearch/reindex', { body: { indexId } })

      // This is set to 5 minutes
      set(() => {
        setSnackbarOpen(true);
        setMessage(`Indexing for ${indexId} has been running for more than 5 minutes.`);
        setSeverity('error');
        indexUpdateSub.unsubscribe();
        setReindexAll(false);
        setReindexing(null);
      }, timeoutTime);


      // TODO: This can be removed. This is just to test the subscription
      setTimeout(async () => {
        await API.graphql({
          query: updateV2ContentMetadata,
          variables: {
            input: {
              id: indexId,
              isIndexing: false,
            },
          },
        });
        console.log(`Finished indexing ${indexId}`);
      }, 3000);

    } catch (error) {
      console.log(error);
    }
  };

  const handleReindexAll = () => {
    setReindexAll(true);
    setCompletedIndexes([]);
    handleReindex(aliases?.[0]?.id);
  };

  return (
    <>
      <Container maxWidth="md">
        <Typography fontSize={30} fontWeight={700}>
          Alias Management
        </Typography>
        <Divider sx={{ my: 3 }} />
        <Stack direction='row' justifyContent='space-between'>
          <Button startIcon={<Add />} onClick={() => handleOpenDialog()} variant="contained">
            Add New Alias
          </Button>
          <LoadingButton loading={reindexing && reindexAll} disabled={reindexing} startIcon={<StorageOutlined />} onClick={handleReindexAll} variant="contained">
            Reindex All
          </LoadingButton>
        </Stack>
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell><b>ID</b></TableCell>
                <TableCell><b>Content Metadata ID</b></TableCell>
                <TableCell align="right"><b>Actions</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {aliases.map((alias) => (
                <TableRow key={alias.id}>
                  <TableCell>{alias.id}</TableCell>
                  <TableCell>{alias.aliasV2ContentMetadataId}</TableCell>
                  <TableCell align="right">
                    <Stack direction='row' justifyContent='end' spacing={1}>
                      <LoadingButton loading={reindexing === alias.id} disabled={reindexing} startIcon={<StorageOutlined />} onClick={() => { handleReindex(alias?.id) }} variant="contained">
                        Reindex
                      </LoadingButton>
                      <IconButton
                        onClick={() => refreshMetadata(alias.aliasV2ContentMetadataId)}
                        disabled={refreshingMetadata === alias.aliasV2ContentMetadataId}
                      >
                        {refreshingMetadata === alias.aliasV2ContentMetadataId ? <CircularProgress size={24} /> : <Refresh />}
                      </IconButton>
                      <IconButton onClick={() => handleOpenDialog(alias)}><Edit /></IconButton>
                      <IconButton onClick={() => handleOpenDeleteDialog(alias)} color="error"><Delete /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
      <AliasFormDialog open={dialogOpen} onClose={handleCloseDialog} onSubmit={handleSubmitForm} initialValues={currentAlias || {}} />
      <ConfirmDeleteDialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog} onConfirm={handleDeleteAlias} />
    </>
  );
};

export default AliasManagementPageRevised;
