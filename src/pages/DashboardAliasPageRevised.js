import React, { useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Container, Divider, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, CircularProgress } from "@mui/material";
import { API, Storage, graphqlOperation } from 'aws-amplify';
import { Add, Edit, Delete, Refresh } from "@mui/icons-material";
import { getV2ContentMetadata, listAliases } from '../graphql/queries';
import { createAlias, updateAlias, deleteAlias, createV2ContentMetadata, updateV2ContentMetadata } from '../graphql/mutations';
import { SnackbarContext } from '../SnackbarContext';

/* Utility Functions */

const fetchAliases = async () => {
  try {
    const response = await API.graphql(graphqlOperation(listAliases));
    return response.data.listAliases.items;
  } catch (error) {
    console.error("Error fetching aliases:", error);
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

AliasFormDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  initialValues: PropTypes.object.isRequired,
};


const ConfirmDeleteDialog = ({ open, onClose, onConfirm }) => (
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

ConfirmDeleteDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

/* Main Component */

const AliasManagementPageRevised = () => {
  const [aliases, setAliases] = useState([]);
  const [, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentAlias, setCurrentAlias] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshingMetadata, setRefreshingMetadata] = useState(false);
  const { setOpen: setSnackbarOpen, setMessage, setSeverity } = useContext(SnackbarContext)

  useEffect(() => {
    fetchAliases().then(data => {
      setAliases(data);
      setLoading(false);
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

  return (
    <>
      <Container maxWidth="md">
        <Typography fontSize={30} fontWeight={700}>
          Alias Management
        </Typography>
        <Divider sx={{ my: 3 }} />
        <Button startIcon={<Add />} onClick={() => handleOpenDialog()} variant="contained">
          Add New Alias
        </Button>
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
                    <IconButton
                      aria-label="refresh metadata"
                      onClick={() => refreshMetadata(alias.aliasV2ContentMetadataId)}
                      disabled={refreshingMetadata === alias.aliasV2ContentMetadataId}
                    >
                      {refreshingMetadata === alias.aliasV2ContentMetadataId ? <CircularProgress size={24} /> : <Refresh />}
                    </IconButton>
                    <IconButton aria-label="edit alias" onClick={() => handleOpenDialog(alias)}><Edit /></IconButton>
                    <IconButton aria-label="delete alias" onClick={() => handleOpenDeleteDialog(alias)} color="error"><Delete /></IconButton>
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
