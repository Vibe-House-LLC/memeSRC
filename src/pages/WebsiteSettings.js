import { generateClient , graphqlOperation } from 'aws-amplify/api';
import { Card, Container, Divider, FormControlLabel, FormGroup, Grid, LinearProgress, Stack, Switch, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { createWebsiteSetting, updateWebsiteSetting } from "../graphql/mutations";
import { getWebsiteSetting } from "../graphql/queries";
import MaintenanceModes from "../sections/@dashboard/website-settings/MaintenanceModes";

const client = generateClient();

export default function WebsiteSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fullSiteMaintenance, setFullSiteMaintenance] = useState(false);
    const [universalSearchMaintenance, setUniversalSearchMaintenance] = useState(false);
    const [globalSettings, setGlobalSettings] = useState();

    useEffect(() => {

        client.graphql({
            query: getWebsiteSetting,
            variables: { id: 'globalSettings' },
            authMode: 'awsIam'
        }).then(response => {
            console.log(response)
            if (response?.data?.getWebsiteSetting) {
                const globalSettings = response?.data?.getWebsiteSetting
                setGlobalSettings(globalSettings || {})
                setFullSiteMaintenance(globalSettings?.fullSiteMaintenance || false)
                setUniversalSearchMaintenance(globalSettings?.universalSearchMaintenance || false)
                setLoading(false)
            } else {
                setGlobalSettings()
                setFullSiteMaintenance(false)
                setUniversalSearchMaintenance(false)
                setLoading(false)
            }
        }).catch(error => {
            console.log(error)
            setLoading(false)
        })

        return () => {
            setGlobalSettings({})
        }
    }, []);

    const saveMaintenance = async () => {
        setSaving(true)
        try {
            if (!globalSettings) {
                const createGlobalSettings = await client.graphql({
                    query: createWebsiteSetting,
                    variables: { input: { id: 'globalSettings' }},
                    authMode: 'awsIam'
                })
                console.log(createGlobalSettings)
            }

            const updateGlobalSettings = await client.graphql({
                query: updateWebsiteSetting,
                variables: { input: { id: 'globalSettings', fullSiteMaintenance, universalSearchMaintenance }},
                authMode: 'awsIam'
            })
            console.log(updateGlobalSettings)
            setGlobalSettings(updateGlobalSettings?.data?.updateWebsiteSetting)
            setSaving(false)
        } catch (error) {
            console.log(error)
            setSaving(false)
        }
        
    }

    return (
        <>
            <Helmet>
                <title>Website Settings - memeSRC 2.0</title>
            </Helmet>
            <Container maxWidth='lg' sx={{ mt: 5 }}>
                <Typography fontSize={34} fontWeight={700}>
                    Website Settings
                </Typography>
                <Typography fontSize={16} fontWeight={700}>
                    Admin only website website functions
                </Typography>
                <Divider sx={{ my: 4 }} />
                {!loading &&
                    <MaintenanceModes
                        saveFunction={saveMaintenance}
                        saving={saving}
                        fullSiteMaintenance={fullSiteMaintenance}
                        universalSearchMaintenance={universalSearchMaintenance}
                        setFullSiteMaintenance={setFullSiteMaintenance}
                        setUniversalSearchMaintenance={setUniversalSearchMaintenance}
                        currentSettings={globalSettings}
                    />
                }
                {loading &&
                    <LinearProgress sx={{ mt: 5 }} />
                }
            </Container>
        </>
    )
}
