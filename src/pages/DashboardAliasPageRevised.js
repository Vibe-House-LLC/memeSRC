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
        <TextField
          autoFocus
          margin="dense"
          name="aliasV2ContentMetadataId"
          label="Content Metadata ID"
          type="text"
          fullWidth
          variant="outlined"
          value={formValues.aliasV2ContentMetadataId || ''}
          onChange={handleChange}
        />
        {/* You can add more fields here if there are more editable attributes */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Submit</Button>
      </DialogActions>
    </Dialog>
  );
};

/* Main Component */

const AliasManagementPageRevised = () => {
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentAlias, setCurrentAlias] = useState(null);

  useEffect(() => {
    fetchAliases().then(data => {
      setAliases(data);
      setLoading(false);
    });
  }, []);

  const handleOpenDialog = (alias = null) => {
    setCurrentAlias(alias);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentAlias(null);
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
      const input = { id: aliasData.id, aliasV2ContentMetadataId: aliasData.aliasV2ContentMetadataId };
      // Adjust this as necessary to include other fields you decide to make editable
      if (aliasData.id) {
        // Update operation
        await API.graphql(graphqlOperation(updateAlias, { input }));
      } else {
        // Create operation
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
                    {/* Implement delete functionality if needed */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>
      <AliasFormDialog open={dialogOpen} onClose={handleCloseDialog} onSubmit={handleSubmitForm} initialValues={currentAlias || {}} />
    </>
  );
};

export default AliasManagementPageRevised;
