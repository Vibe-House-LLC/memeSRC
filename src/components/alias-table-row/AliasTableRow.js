import { generateClient } from 'aws-amplify/api';
const client = generateClient();
import { Add } from "@mui/icons-material";
import { Button, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, TableCell, TableRow, TextField, Typography } from "@mui/material";
import { API, graphqlOperation } from 'aws-amplify/api';
import { useContext, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { getAlias } from "../../graphql/queries";
import { createAlias, updateAlias } from "../../graphql/mutations";
import { SnackbarContext } from "../../SnackbarContext";
/* -------------------------------- Functions ------------------------------- */

const saveCidToAlias = async (cid, alias) => {
    try {
        const doesAliasExist = await client.graphql({
            query: getAlias,
            variables: { id: alias },
            authMode: 'awsIam'
        })

        if (doesAliasExist?.data?.getAlias?.id) {
            // The alias exists.
            const updatedAlias = await client.graphql({
                query: updateAlias,
                variables: { input: { id: alias, aliasV2ContentMetadataId: cid } },
                authMode: 'awsIam'
            })
            console.log(updatedAlias)
            return {
                message: 'Alias has been updated!'
            }
        }
        // The alias does not exists.
        const createdAlias = await client.graphql({
            query: createAlias,
            variables: { input: { id: alias, aliasV2ContentMetadataId: cid } },
            authMode: 'awsIam'
        })
        console.log(createdAlias)
        return {
            message: 'Alias has been created!'
        }
    } catch (error) {
        console.log(error)
        return {
            message: 'Something went wrong.',
            error: true
        }
    }
}

export default function AliasTableRow({ row }) {
    const [saving, setSaving] = useState(false);
    const [alias, setAlias] = useState('');
    const [open, setOpen] = useState(false);
    const { setOpen: setSnackbarOpen, setMessage, setSeverity } = useContext(SnackbarContext)

    const handleClose = () => {
        setAlias('')
        setOpen(false)
    }

    const handleSave = async () => {
        setSaving(true)
        const handledAlias = await saveCidToAlias(row.id, alias)
        if (handledAlias?.error) {
            setSaving(false)
            handleClose()
            setMessage(handledAlias?.message)
            setSeverity('error')
            setSnackbarOpen(true)
        } else {
            setSaving(false)
            handleClose()
            setMessage(handledAlias?.message)
            setSeverity('success')
            setSnackbarOpen(true)
        }

        return null
    }


    return (
        <>
            <TableRow
                key={row.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
                <TableCell align='left'>
                    <Typography fontSize={18}>{row?.title}</Typography>
                    <Typography fontSize={12}>{row?.id}</Typography>
                </TableCell>
                <TableCell align='right'>
                    <IconButton onClick={() => { setOpen(true) }}>
                        <Add />
                    </IconButton>
                </TableCell>
            </TableRow>
            <Dialog
                open={open}
                onClose={saving ? () => { } : handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    Assign to Alias
                </DialogTitle>
                <DialogContent>
                    <TextField
                        value={alias}
                        onChange={(event) => {
                            setAlias(event.target.value)
                        }}
                        label='Alias'
                        fullWidth
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" disabled={saving} onClick={handleClose}>Cancel</Button>
                    <LoadingButton color='primary' disabled={saving || !alias} loading={saving} variant="contained" onClick={handleSave}>
                        Save
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </>
    )
}
