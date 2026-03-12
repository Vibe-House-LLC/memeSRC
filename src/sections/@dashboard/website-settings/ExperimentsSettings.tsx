import React from 'react';
import { Visibility, VisibilityOff, Save } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Alert, Card, Grid, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';

type ExperimentsSaveStatus = 'idle' | 'success' | 'error';

type ExperimentsSettingsProps = {
  saveFunction?: () => void | Promise<void>;
  saving?: boolean;
  experimentsHostName: string;
  onExperimentsHostNameChange: (value: string) => void;
  experimentsApiKey: string;
  onExperimentsApiKeyChange: (value: string) => void;
  saveStatus?: ExperimentsSaveStatus;
};

const ExperimentsSettings: React.FC<ExperimentsSettingsProps> = ({
  saveFunction = () => {},
  saving = false,
  experimentsHostName,
  onExperimentsHostNameChange,
  experimentsApiKey,
  onExperimentsApiKeyChange,
  saveStatus = 'idle',
}) => {
  const [showApiKey, setShowApiKey] = React.useState(false);

  const handleSave = () => {
    saveFunction();
  };

  return (
    <Grid container spacing={3} sx={{ mt: 4, mb: 10 }}>
      <Grid item xs={12} md={4}>
        <Typography fontSize={24} fontWeight={700}>
          Experiments
        </Typography>
        <Typography fontSize={14} fontWeight={500}>
          Configure the experiments service hostname and API key
        </Typography>
      </Grid>
      <Grid item xs={12} md={8}>
        <Card sx={{ p: 2 }} variant="outlined">
          <Stack spacing={2}>
            <TextField
              label="Experiments Host Name"
              value={experimentsHostName}
              onChange={(event) => onExperimentsHostNameChange(event.target.value)}
              disabled={saving}
              fullWidth
            />
            <TextField
              label="Experiments API Key"
              type={showApiKey ? 'text' : 'password'}
              value={experimentsApiKey}
              onChange={(event) => onExperimentsApiKeyChange(event.target.value)}
              disabled={saving}
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showApiKey ? 'Hide experiments API key' : 'Show experiments API key'}
                      onClick={() => setShowApiKey((current) => !current)}
                      onMouseDown={(event) => event.preventDefault()}
                      edge="end"
                    >
                      {showApiKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
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
            {saveStatus === 'success' && (
              <Alert severity="success">Experiments settings saved.</Alert>
            )}
            {saveStatus === 'error' && (
              <Alert severity="error">Failed to save experiments settings.</Alert>
            )}
          </Stack>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ExperimentsSettings;
