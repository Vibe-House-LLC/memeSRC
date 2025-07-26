import Save from '@mui/icons-material/Save';
import { LoadingButton } from '@mui/lab';
import { Card, FormControlLabel, FormGroup, Grid, Stack, Switch, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function MaintenanceModes({
    saveFunction = () => {},
    saving,
    fullSiteMaintenance,
    setFullSiteMaintenance,
    universalSearchMaintenance,
    setUniversalSearchMaintenance,
}) {


    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
                <Typography fontSize={24} fontWeight={700}>
                    Maintenance Modes
                </Typography>
                <Typography fontSize={14} fontWeight={500}>
                    Disable features or the entire website
                </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
                <Card sx={{ p: 2 }} variant='outlined'>
                    <Stack spacing={2}>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Switch
                                        disabled={saving}
                                        checked={fullSiteMaintenance}
                                        onChange={(event) => {
                                            setFullSiteMaintenance(event.target.checked)
                                        }}
                                    />
                                }
                                label="Full Site Maintenance Mode"
                            />
                        </FormGroup>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Switch
                                        disabled={saving}
                                        checked={universalSearchMaintenance}
                                        onChange={(event) => {
                                            setUniversalSearchMaintenance(event.target.checked)
                                        }}
                                    />
                                }
                                label="Universal Search Maintenance Mode"
                            />
                        </FormGroup>
                        <LoadingButton onClick={saveFunction} disabled={saving} startIcon={<Save />} variant='contained' loading={saving}>
                            Save Changes
                        </LoadingButton>
                    </Stack>
                </Card>
            </Grid>
        </Grid>
    )
}

MaintenanceModes.propTypes = {
    saveFunction: PropTypes.func,
    saving: PropTypes.bool,
    fullSiteMaintenance: PropTypes.string,
    setFullSiteMaintenance: PropTypes.func,
    universalSearchMaintenance: PropTypes.string,
    setUniversalSearchMaintenance: PropTypes.func,
}