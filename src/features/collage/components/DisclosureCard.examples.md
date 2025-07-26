# DisclosureCard Component Examples

## Basic Usage

```jsx
import DisclosureCard from './DisclosureCard';
import { Settings } from '@mui/icons-material';

// Simple disclosure card
<DisclosureCard
  title="Settings"
  icon={Settings}
>
  <p>Your settings content goes here</p>
</DisclosureCard>
```

## With Subtitle

```jsx
<DisclosureCard
  title="Advanced Settings"
  subtitle="Configure advanced options"
  icon={Settings}
  defaultOpen={true}
>
  <AdvancedSettingsForm />
</DisclosureCard>
```

## Different Variants

```jsx
// Default variant (elevation: 1, border)
<DisclosureCard title="Default" icon={InfoIcon}>
  <Content />
</DisclosureCard>

// Outlined variant (no elevation, border only)
<DisclosureCard title="Outlined" icon={InfoIcon} variant="outlined">
  <Content />
</DisclosureCard>

// Elevated variant (elevation: 3, no border)
<DisclosureCard title="Elevated" icon={InfoIcon} variant="elevated">
  <Content />
</DisclosureCard>
```

## Mobile-Responsive

```jsx
const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

<DisclosureCard
  title="Mobile-Aware Card"
  icon={PhoneIcon}
  isMobile={isMobile}
  defaultOpen={!isMobile} // Closed on mobile, open on desktop
>
  <ResponsiveContent />
</DisclosureCard>
```

## Custom Styling

```jsx
<DisclosureCard
  title="Custom Styled"
  icon={PaletteIcon}
  sx={{
    bgcolor: 'primary.dark',
    '& .MuiPaper-root': {
      backgroundColor: 'primary.main'
    }
  }}
  contentSx={{
    bgcolor: 'background.default',
    borderRadius: 1
  }}
>
  <StyledContent />
</DisclosureCard>
```

## With Toggle Callback

```jsx
const [isOpen, setIsOpen] = useState(false);

<DisclosureCard
  title="Interactive Card"
  icon={TouchAppIcon}
  onToggle={(open) => {
    setIsOpen(open);
    console.log(`Card is now ${open ? 'open' : 'closed'}`);
  }}
>
  <p>Current state: {isOpen ? 'Open' : 'Closed'}</p>
</DisclosureCard>
```

## Real-World Examples

### Settings Panel
```jsx
<DisclosureCard
  title="Collage Settings"
  icon={Settings}
  defaultOpen={false}
  isMobile={isMobile}
  sx={{ mb: 2 }}
  contentSx={{ pt: 1 }}
>
  <CollageSettingsStep {...settingsStepProps} />
</DisclosureCard>
```

### Image Collection Manager
```jsx
<DisclosureCard
  title={`Image Collection (${imageCount})`}
  icon={PhotoLibrary}
  defaultOpen={true}
  isMobile={isMobile}
  sx={{ width: '100%' }}
>
  <ImageCollectionContent />
</DisclosureCard>
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | Required | The title displayed in the header |
| `icon` | `React.ComponentType` | Optional | Icon component to display next to title |
| `children` | `React.ReactNode` | Required | Content to display when expanded |
| `defaultOpen` | `boolean` | `false` | Whether the card should be open by default |
| `subtitle` | `string` | Optional | Optional subtitle/description text |
| `onToggle` | `(open: boolean) => void` | Optional | Callback when toggle state changes |
| `sx` | `object` | `{}` | Additional styling for the paper container |
| `contentSx` | `object` | `{}` | Additional styling for the content area |
| `isMobile` | `boolean` | `false` | Whether to apply mobile-specific styling |
| `variant` | `'default' \| 'outlined' \| 'elevated'` | `'default'` | Visual variant |
| `...paperProps` | `object` | - | Additional props passed to the Paper component | 