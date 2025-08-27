import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Container, Divider, Grid, Stack, Typography, Box } from '@mui/material';
// alpha no longer used here; frosted logic handled in base components
import { UserContext } from '../UserContext';
import { BaseButton, BaseCard, BaseInput, BaseModal, BaseSelect, BaseSwitch } from '../components/base';

export default function UIStyleGuidePage() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.['cognito:groups']?.includes('admins');
  const [modalOpen, setModalOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectValue, setSelectValue] = useState<string | number>('one');
  const [switchOn, setSwitchOn] = useState(false);
  const [textValue, setTextValue] = useState('Hello world');
  // Search hero preview state
  const [searchSeries, setSearchSeries] = useState<string | number>('_all');
  const [searchTerm, setSearchTerm] = useState('');
  const [frostColor, setFrostColor] = useState<string>('#000000');
  const [frostOpacity, setFrostOpacity] = useState<number>(0.9);
  const [frostBlur, setFrostBlur] = useState<number>(5);

  if (!isAdmin) {
    return <Navigate to="/404" replace />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
        UI Style Guide
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Admin-only sandbox for testing standardized base components.
      </Typography>

      <Grid container spacing={3}>
        {/* Search Hero (Preview) */}
        <Grid item xs={12}>
          <BaseCard
            sx={{
              p: { xs: 0, sm: 2 },
              borderRadius: 2,
              boxShadow: { xs: 'none', sm: undefined },
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, px: { xs: 2, sm: 0 } }}>Homepage Search (Preview)</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
              <BaseInput
                label="Frosted color"
                size="small"
                value={frostColor}
                onChange={(e) => setFrostColor(e.target.value)}
                helperText="Any CSS color e.g. #000, black, rgba(...)"
                sx={{ maxWidth: 320 }}
              />
              <BaseInput
                label="Frosted opacity"
                size="small"
                type="number"
                inputProps={{ step: 0.05, min: 0, max: 1 }}
                value={frostOpacity}
                onChange={(e) => setFrostOpacity(Number(e.target.value))}
                sx={{ maxWidth: 200 }}
              />
              <BaseInput
                label="Frosted blur (px)"
                size="small"
                type="number"
                inputProps={{ step: 1, min: 0, max: 24 }}
                value={frostBlur}
                onChange={(e) => setFrostBlur(Number(e.target.value))}
                sx={{ maxWidth: 200 }}
              />
            </Stack>
            <Box
              sx={{
                borderRadius: 2,
                overflow: 'hidden',
                p: { xs: 3, sm: 5 },
                width: { xs: '100vw', sm: 'auto' },
                ml: { xs: 'calc(-50vw + 50%)', sm: 0 },
                backgroundImage: `linear-gradient(45deg,
                  #5461c8 12.5%,
                  #c724b1 0, #c724b1 25%,
                  #e4002b 0, #e4002b 37.5%,
                  #ff6900 0, #ff6900 50%,
                  #f6be00 0, #f6be00 62.5%,
                  #97d700 0, #97d700 75%,
                  #00ab84 0, #00ab84 87.5%,
                  #00a3e0 0)`,
                color: '#fff',
              }}
            >
              <Stack spacing={2} alignItems="center">
                <Typography
                  component="h1"
                  variant="h4"
                  sx={{ fontWeight: 800, textShadow: '0 1px 1px rgba(0,0,0,0.25)' }}
                >
                  memeSRC
                </Typography>
                <Grid container spacing={1} sx={{ width: '100%', maxWidth: 960 }}>
                  <Grid item xs={12} sm={3.5}>
                    <BaseSelect
                      size="medium"
                      value={searchSeries}
                      onChange={setSearchSeries}
                      options={[
                        { label: 'All Shows & Movies', value: '_all', prefix: '🌈' },
                        { label: 'Universal', value: '_universal', prefix: '🌐' },
                        { label: 'Favorites', value: '_favorites', prefix: '⭐' },
                        { label: 'Example A', value: 'a', prefix: '🅰️' },
                      ]}
                      frosted
                      surface="light"
                      frostOpacity={frostOpacity}
                      rounded={2}
                      frostBlur={frostBlur}
                    />
                  </Grid>
                  <Grid item xs={12} sm={7}>
                    <BaseInput
                      size="medium"
                      placeholder="Search templates"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      frosted
                      surface="light"
                      frostOpacity={frostOpacity}
                      frostBlur={frostBlur}
                      rounded={2}
                      leadingIcon={"🔎"}
                      allowClear
                      onClear={() => setSearchTerm('')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={1.5}>
                    <BaseButton
                      fullWidth
                      size="medium"
                      frosted
                      surface="dark"
                      frostOpacity={frostOpacity}
                      frostBlur={frostBlur}
                      rounded={2}
                      sx={{ fontWeight: 800, fontSize: { xs: '1rem', sm: '1.125rem' } }}
                    >
                      Search
                    </BaseButton>
                  </Grid>
                </Grid>
                <Typography component="h2" variant="h6" sx={{ opacity: 0.95 }}>
                  Search 85 million+ templates
                </Typography>
              </Stack>
            </Box>
          </BaseCard>
        </Grid>
        {/* Buttons */}
        <Grid item xs={12}>
          <BaseCard>
            <Typography variant="h6" sx={{ mb: 2 }}>Buttons</Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <BaseButton>Primary</BaseButton>
              <BaseButton variant="outlined">Outlined</BaseButton>
              <BaseButton variant="text">Text</BaseButton>
              <BaseButton tone="secondary">Secondary</BaseButton>
              <BaseButton tone="success">Success</BaseButton>
              <BaseButton tone="warning">Warning</BaseButton>
              <BaseButton tone="danger">Danger</BaseButton>
              <BaseButton size="small">Small</BaseButton>
              <BaseButton size="large">Large</BaseButton>
              <BaseButton disabled>Disabled</BaseButton>
            </Stack>
          </BaseCard>
        </Grid>

        {/* Inputs */}
        <Grid item xs={12} md={6}>
          <BaseCard>
            <Typography variant="h6" sx={{ mb: 2 }}>Inputs</Typography>
            <Stack spacing={2}>
              <BaseInput label="Default" value={textValue} onChange={(e) => setTextValue(e.target.value)} />
              <BaseInput label="With helper" helperText="Helper text" />
              <BaseInput label="Small" size="small" />
              <BaseInput label="Medium" size="medium" />
            </Stack>
          </BaseCard>
        </Grid>

        {/* Selects */}
        <Grid item xs={12} md={6}>
          <BaseCard>
            <Typography variant="h6" sx={{ mb: 2 }}>Selects</Typography>
            <Stack spacing={2}>
              <BaseSelect
                label="Choose one"
                options={[
                  { label: 'One', value: 'one' },
                  { label: 'Two', value: 'two' },
                  { label: 'Three', value: 'three' },
                ]}
                value={selectValue}
                onChange={setSelectValue}
              />
              <BaseSelect
                label="Medium size"
                size="medium"
                options={[
                  { label: 'Alpha', value: 'a' },
                  { label: 'Beta', value: 'b' },
                ]}
                value={selectValue}
                onChange={setSelectValue}
              />
            </Stack>
          </BaseCard>
        </Grid>

        {/* Switch */}
        <Grid item xs={12} md={6}>
          <BaseCard>
            <Typography variant="h6" sx={{ mb: 2 }}>Switch</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <BaseSwitch label="Enable feature" checked={switchOn} onChange={setSwitchOn} />
              <Divider flexItem orientation="vertical" />
              <Typography variant="body2">State: {switchOn ? 'On' : 'Off'}</Typography>
            </Stack>
          </BaseCard>
        </Grid>

        {/* Card & Modal */}
        <Grid item xs={12} md={6}>
          <BaseCard>
            <Typography variant="h6" sx={{ mb: 2 }}>Card & Modal</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Cards provide a consistent container. Modal wraps MUI Dialog with simple slots.
            </Typography>
            <Stack direction="row" spacing={1}>
              <BaseButton onClick={() => setModalOpen(true)}>Open Confirm Modal</BaseButton>
              <BaseButton variant="outlined" onClick={() => setFormModalOpen(true)}>Open Form Modal</BaseButton>
            </Stack>
            <BaseModal
              open={modalOpen}
              title="Example Modal"
              onClose={() => setModalOpen(false)}
              actions={
                <>
                  <BaseButton variant="text" onClick={() => setModalOpen(false)}>Cancel</BaseButton>
                  <BaseButton onClick={() => setModalOpen(false)}>Confirm</BaseButton>
                </>
              }
            >
              <Typography variant="body2">
                This is a standardized modal. Use it for confirmations and forms.
              </Typography>
            </BaseModal>
            <BaseModal
              open={formModalOpen}
              variant="form"
              title="Form Modal"
              onClose={() => setFormModalOpen(false)}
              actions={
                <>
                  <BaseButton variant="text" onClick={() => setFormModalOpen(false)}>Cancel</BaseButton>
                  <BaseButton onClick={() => setFormModalOpen(false)}>Save</BaseButton>
                </>
              }
            >
              <Typography variant="body2" sx={{ mb: 2 }}>
                The form variant uses a larger width. Put fields here.
              </Typography>
              <Stack spacing={1.5}>
                <BaseInput label="Title" value={textValue} onChange={(e) => setTextValue(e.target.value)} />
                <BaseSelect
                  label="Category"
                  options={[
                    { label: 'One', value: 'one' },
                    { label: 'Two', value: 'two' },
                  ]}
                  value={selectValue}
                  onChange={setSelectValue}
                />
                <BaseSwitch label="Enable option" checked={switchOn} onChange={setSwitchOn} />
              </Stack>
            </BaseModal>
          </BaseCard>
        </Grid>
      </Grid>
    </Container>
  );
}
