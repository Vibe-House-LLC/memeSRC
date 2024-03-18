import { Card, Container, Divider, FormControlLabel, FormGroup, Grid, Switch, Typography } from "@mui/material";
import { useState } from "react";

export default function WebsiteSettings() {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [fullSiteMaintenance, setFullSiteMaintenance] = useState(false);

    return (
        <Container maxWidth='lg' sx={{ mt: 5 }}>
            <Typography fontSize={34} fontWeight={700}>
                Website Settings
            </Typography>
            <Typography fontSize={16} fontWeight={700}>
                Admin only website website functions
            </Typography>
            <Divider sx={{ my: 4 }} />
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Typography fontSize={24} fontWeight={700}>
                        Kill Switches
                    </Typography>
                    <Typography fontSize={14} fontWeight={500}>
                        Disable features or the entire website
                    </Typography>
                </Grid>
                <Grid item xs={12} md={8}>
                    <Card sx={{ p: 2 }} variant='outlined'>
                        <FormGroup>
                            <FormControlLabel
                                control={
                                    <Switch
                                        disabled={loading || saving}
                                        checked={fullSiteMaintenance}
                                        onChange={(event) => {
                                            setFullSiteMaintenance(event.target.checked)
                                        }}
                                    />
                                }
                                label="Full Site Maintenance Mode"
                            />
                        </FormGroup>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    )
}
