import { Add } from "@mui/icons-material";
import { Button, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, IconButton, TableCell, TableRow, TextField } from "@mui/material";
import { API, graphqlOperation } from "aws-amplify";
import { useContext, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { getAlias } from "../../graphql/queries";
import { createAlias, updateAlias } from "../../graphql/mutations";
import { SnackbarContext } from "../../SnackbarContext";
/* -------------------------------- Functions ------------------------------- */

const saveCidToAlias = async (cid, alias) => {
    try {
        const doesAliasExist = await API.graphql(graphqlOperation(getAlias, { id: alias }))

        if (doesAliasExist?.data?.getAlias?.id) {
            // The alias exists.
            const updatedAlias = await API.graphql(graphqlOperation(updateAlias, { input: { id: alias, aliasV2ContentMetadataId: cid } }))
            console.log(updatedAlias)
            return {
                message: 'Alias has been updated!'
            }
        }
        // The alias does not exists.
        const createdAlias = await API.graphql(graphqlOperation(createAlias, { input: { id: alias, aliasV2ContentMetadataId: cid } }))
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
                    {row?.title}
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
