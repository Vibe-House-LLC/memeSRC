import { Container, Divider, LinearProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { API, graphqlOperation } from "aws-amplify";
import { createWebsiteSetting, updateWebsiteSetting } from "../graphql/mutations";
import { getWebsiteSetting } from "../graphql/queries";
import MaintenanceModes from "../sections/@dashboard/website-settings/MaintenanceModes";
import RateLimits from "../sections/@dashboard/website-settings/RateLimits";

export default function WebsiteSettings() {
    const [loading, setLoading] = useState(true);
    const [savingMaintenance, setSavingMaintenance] = useState(false);
    const [savingRateLimits, setSavingRateLimits] = useState(false);
    const [fullSiteMaintenance, setFullSiteMaintenance] = useState(false);
    const [universalSearchMaintenance, setUniversalSearchMaintenance] = useState(false);
    const [openAIRateLimit, setOpenAIRateLimit] = useState('100');
    const [nanoBananaRateLimit, setNanoBananaRateLimit] = useState('100');
    const [globalSettings, setGlobalSettings] = useState();

    useEffect(() => {

        API.graphql(
            graphqlOperation(getWebsiteSetting, { id: 'globalSettings' })
        ).then(response => {
            console.log(response)
            if (response?.data?.getWebsiteSetting) {
                const globalSettings = response?.data?.getWebsiteSetting
                setGlobalSettings(globalSettings || {})
                setFullSiteMaintenance(globalSettings?.fullSiteMaintenance || false)
                setUniversalSearchMaintenance(globalSettings?.universalSearchMaintenance || false)
                setOpenAIRateLimit((globalSettings?.openAIRateLimit ?? 100).toString())
                setNanoBananaRateLimit((globalSettings?.nanoBananaRateLimit ?? 100).toString())
                setLoading(false)
            } else {
                setGlobalSettings()
                setFullSiteMaintenance(false)
                setUniversalSearchMaintenance(false)
                setOpenAIRateLimit('100')
                setNanoBananaRateLimit('100')
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

    const ensureGlobalSettings = async () => {
        if (globalSettings) {
            return globalSettings;
        }

        const createGlobalSettings = await API.graphql(
            graphqlOperation(createWebsiteSetting, { input: { id: 'globalSettings' }})
        )
        const createdSettings = createGlobalSettings?.data?.createWebsiteSetting
        if (createdSettings) {
            setGlobalSettings(createdSettings)
        }
        return createdSettings
    }

    const saveMaintenance = async () => {
        setSavingMaintenance(true)
        try {
            await ensureGlobalSettings()

            const updateGlobalSettings = await API.graphql(
                graphqlOperation(updateWebsiteSetting, { input: { id: 'globalSettings', fullSiteMaintenance, universalSearchMaintenance }})
            )
            console.log(updateGlobalSettings)
            setGlobalSettings(updateGlobalSettings?.data?.updateWebsiteSetting)
        } catch (error) {
            console.log(error)
        }
        setSavingMaintenance(false)
        
    }

    const saveRateLimits = async () => {
        setSavingRateLimits(true)
        try {
            await ensureGlobalSettings()

            const parsedOpenAIRateLimit = parseInt(openAIRateLimit, 10)
            const safeOpenAIRateLimit = Number.isNaN(parsedOpenAIRateLimit) ? 0 : parsedOpenAIRateLimit
            const parsedNanoBananaRateLimit = parseInt(nanoBananaRateLimit, 10)
            const safeNanoBananaRateLimit = Number.isNaN(parsedNanoBananaRateLimit) ? 0 : parsedNanoBananaRateLimit

            const updateGlobalSettings = await API.graphql(
                graphqlOperation(updateWebsiteSetting, { input: { id: 'globalSettings', openAIRateLimit: safeOpenAIRateLimit, nanoBananaRateLimit: safeNanoBananaRateLimit }})
            )
            console.log(updateGlobalSettings)
            setGlobalSettings(updateGlobalSettings?.data?.updateWebsiteSetting)
        } catch (error) {
            console.log(error)
        }
        setSavingRateLimits(false)
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
                    <>
                        <MaintenanceModes
                            saveFunction={saveMaintenance}
                            saving={savingMaintenance}
                            fullSiteMaintenance={fullSiteMaintenance}
                            universalSearchMaintenance={universalSearchMaintenance}
                            setFullSiteMaintenance={setFullSiteMaintenance}
                            setUniversalSearchMaintenance={setUniversalSearchMaintenance}
                            currentSettings={globalSettings}
                        />
                        <RateLimits
                            saveFunction={saveRateLimits}
                            saving={savingRateLimits}
                            openAIRateLimit={openAIRateLimit}
                            nanoBananaRateLimit={nanoBananaRateLimit}
                            setOpenAIRateLimit={setOpenAIRateLimit}
                            setNanoBananaRateLimit={setNanoBananaRateLimit}
                        />
                    </>
                }
                {loading &&
                    <LinearProgress sx={{ mt: 5 }} />
                }
            </Container>
        </>
    )
}
