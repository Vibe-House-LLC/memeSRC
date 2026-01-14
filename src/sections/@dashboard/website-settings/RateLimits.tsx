import React, { useEffect, useMemo, useState } from 'react';
import { Save } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Card, Divider, Grid, Stack, TextField, Typography } from '@mui/material';
import { API, graphqlOperation } from 'aws-amplify';
import { getRateLimit, getWebsiteSetting } from '../../../graphql/queries';

type RateLimitsProps = {
    saveFunction?: () => void | Promise<void>;
    saving?: boolean;
    openAIRateLimit: string;
    setOpenAIRateLimit: React.Dispatch<React.SetStateAction<string>>;
    nanoBananaRateLimit: string;
    setNanoBananaRateLimit: React.Dispatch<React.SetStateAction<string>>;
    moderationThreshold: string;
    setModerationThreshold: React.Dispatch<React.SetStateAction<string>>;
};

const RateLimits: React.FC<RateLimitsProps> = ({
    saveFunction = () => {},
    saving = false,
    openAIRateLimit,
    setOpenAIRateLimit,
    nanoBananaRateLimit,
    setNanoBananaRateLimit,
    moderationThreshold,
    setModerationThreshold,
}) => {
    const [usage, setUsage] = useState<{ openaiUsage: number; geminiUsage: number; resetAt: string | null }>({
        openaiUsage: 0,
        geminiUsage: 0,
        resetAt: null,
    });

    const handleOpenAIRateLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const digitsOnly = value.replace(/\D/g, '');
        const normalized = digitsOnly === '' ? '' : digitsOnly.replace(/^0+(?=\d)/, '');
        setOpenAIRateLimit(normalized);
    };

    const handleNanoBananaRateLimitChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const digitsOnly = value.replace(/\D/g, '');
        const normalized = digitsOnly === '' ? '' : digitsOnly.replace(/^0+(?=\d)/, '');
        setNanoBananaRateLimit(normalized);
    };

    const handleModerationThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        const sanitized = value.replace(/[^\d.]/g, '');
        const normalized = sanitized.replace(/(\..*)\./g, '$1');
        setModerationThreshold(normalized);
    };

    const handleSave = () => {
        saveFunction();
    };

    const resetAtLocal = useMemo(() => {
        if (!usage.resetAt) return '';
        const date = new Date(usage.resetAt);
        return date.toLocaleString();
    }, [usage.resetAt]);

    useEffect(() => {
        const fetchUsage = async () => {
            const dayId = new Date().toISOString().slice(0, 10);
            try {
                const settingsResp = await API.graphql(graphqlOperation(getWebsiteSetting, { id: 'globalSettings' })) as any;
                let rateResp: any = null;
                try {
                    rateResp = await API.graphql(graphqlOperation(getRateLimit, { id: dayId }));
                } catch (_) {
                    rateResp = null;
                }
                const settings = (settingsResp as any)?.data?.getWebsiteSetting || {};
                const rate = (rateResp as any)?.data?.getRateLimit || {};
                setOpenAIRateLimit(String(settings?.openAIRateLimit ?? openAIRateLimit));
                setNanoBananaRateLimit(String(settings?.nanoBananaRateLimit ?? nanoBananaRateLimit));
                setModerationThreshold(String(settings?.moderationThreshold ?? moderationThreshold));
                setUsage({
                    openaiUsage: Number(rate?.openaiUsage || 0),
                    geminiUsage: Number(rate?.geminiUsage || 0),
                    resetAt: new Date(`${dayId}T23:59:59.999Z`).toISOString(),
                });
            } catch (err) {
                console.warn('[RateLimits] Failed to fetch usage', err);
            }
        };
        void fetchUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Grid container spacing={3} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
                <Typography fontSize={24} fontWeight={700}>
                    Rate Limits
                </Typography>
                <Typography fontSize={14} fontWeight={500}>
                    Configure daily limits for external AI providers
                </Typography>
            </Grid>
            <Grid item xs={12} md={8}>
                <Card sx={{ p: 2 }} variant="outlined">
                    <Stack spacing={2}>
                        <TextField
                            type="text"
                            label="OpenAI Rate Limit"
                            value={openAIRateLimit}
                            onChange={handleOpenAIRateLimitChange}
                            disabled={saving}
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                            fullWidth
                        />
                        <Typography variant="body2" color="text.secondary">
                            Current usage (OpenAI): {usage.openaiUsage} / {openAIRateLimit || '—'}
                        </Typography>
                        <TextField
                            type="text"
                            label="Nano Banana Rate Limit"
                            value={nanoBananaRateLimit}
                            onChange={handleNanoBananaRateLimitChange}
                            disabled={saving}
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                            fullWidth
                        />
                        <Typography variant="body2" color="text.secondary">
                            Current usage (Nano Banana): {usage.geminiUsage} / {nanoBananaRateLimit || '—'}
                        </Typography>
                        {resetAtLocal && (
                            <Typography variant="body2" color="text.secondary">
                                Usage resets at (local): {resetAtLocal}
                            </Typography>
                        )}
                        <Divider sx={{ my: 1 }} />
                        <TextField
                            type="text"
                            label="Moderation Threshold"
                            value={moderationThreshold}
                            onChange={handleModerationThresholdChange}
                            disabled={saving}
                            inputProps={{ inputMode: 'decimal', pattern: '[0-9.]*' }}
                            helperText="Use a value between 0 and 1."
                            fullWidth
                        />
                        <LoadingButton
                            onClick={handleSave}
                            disabled={saving}
                            startIcon={<Save />}
                            variant="contained"
                            loading={saving}
                        >
                            Save Changes
                        </LoadingButton>
                    </Stack>
                </Card>
            </Grid>
        </Grid>
    );
};

export default RateLimits;
