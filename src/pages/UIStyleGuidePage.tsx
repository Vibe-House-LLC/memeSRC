import React, { useContext, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Container, Divider, Grid, Stack, Typography } from '@mui/material';
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
