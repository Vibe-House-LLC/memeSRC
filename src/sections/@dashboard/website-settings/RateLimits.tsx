import React from 'react';
import { Save } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Card, Grid, Stack, TextField, Typography } from '@mui/material';

type RateLimitsProps = {
    saveFunction?: () => void | Promise<void>;
    saving?: boolean;
    openAIRateLimit: string;
    setOpenAIRateLimit: React.Dispatch<React.SetStateAction<string>>;
    nanoBananaRateLimit: string;
    setNanoBananaRateLimit: React.Dispatch<React.SetStateAction<string>>;
};

const RateLimits: React.FC<RateLimitsProps> = ({
    saveFunction = () => {},
    saving = false,
    openAIRateLimit,
    setOpenAIRateLimit,
    nanoBananaRateLimit,
    setNanoBananaRateLimit,
}) => {
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

    const handleSave = () => {
        saveFunction();
    };

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
                        <TextField
                            type="text"
                            label="Nano Banana Rate Limit"
                            value={nanoBananaRateLimit}
                            onChange={handleNanoBananaRateLimitChange}
                            disabled={saving}
                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
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
