import React, { useEffect, useState } from 'react';
import { Container, Divider, IconButton, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { API, graphqlOperation } from 'aws-amplify';
import { Add, Edit, Delete } from "@mui/icons-material";
import { listAliases } from '../graphql/queries';
import { createAlias, updateAlias, deleteAlias } from '../graphql/mutations';

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
        { !initialValues.id && ( // Show this field only when creating a new alias
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
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentAlias, setCurrentAlias] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleSubmitForm = async (aliasData) => {
    try {
      const input = {
        // Define your input here as before
        id: aliasData.id, 
        aliasV2ContentMetadataId: aliasData.aliasV2ContentMetadataId,
        // Add other fields as necessary
      };
  
      if (isEditing) {
        await API.graphql(graphqlOperation(updateAlias, { input }));
      } else {
        await API.graphql(graphqlOperation(createAlias, { input }));
      }
      refreshAliases();
    } catch (error) {
      console.error("Error submitting form:", error);
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
                    <IconButton onClick={() => handleOpenDialog(alias)}><Edit /></IconButton>
                    <IconButton onClick={() => handleOpenDeleteDialog(alias)} color="error"><Delete /></IconButton>
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