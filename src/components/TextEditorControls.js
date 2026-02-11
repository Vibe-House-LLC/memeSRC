// TextEditorControls.js

import * as React from 'react';
import PropTypes from 'prop-types';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { FontDownloadOutlined, FormatSizeRounded, Settings } from '@mui/icons-material';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import IconButton from '@mui/material/IconButton';
import { MenuItem, Select, Typography, Menu, InputAdornment, Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import fonts from '../utils/fonts';

// Update PropTypes to include layerColor and layerStrokeColor
TextEditorControls.propTypes = {
  handleStyle: PropTypes.func,
  index: PropTypes.number,
  fontSizePickerShowing: PropTypes.bool,
  showFontSizePicker: PropTypes.func,
  showColorPicker: PropTypes.func,
  handleFontChange: PropTypes.func,
  layerColor: PropTypes.string,
  layerStrokeColor: PropTypes.string,
  handleAlignment: PropTypes.func,
  layerFonts: PropTypes.object.isRequired,
  setLayerFonts: PropTypes.func.isRequired,
  activeFormats: PropTypes.arrayOf(PropTypes.string),
  showHeader: PropTypes.bool,
};

const FontSelector = ({ selectedFont, onSelectFont, index }) => (
  <Select
    value={selectedFont || 'Arial'}
    onChange={(e) => onSelectFont(e.target.value, index)}
    displayEmpty
    inputProps={{ 'aria-label': 'Without label' }}
    size="small"
    startAdornment={
      <InputAdornment position="start">
        <FontDownloadOutlined sx={{ mr: 0.5 }} />
      </InputAdornment>
    }
    sx={{
      '& .MuiSelect-select': {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontFamily: selectedFont || 'Arial',
      },
    }}
  >
    {fonts.map((font) => (
      <MenuItem key={font} value={font} sx={{ fontFamily: font }}>
        {font}
      </MenuItem>
    ))}
  </Select>
);

FontSelector.propTypes = {
  selectedFont: PropTypes.string,
  onSelectFont: PropTypes.func.isRequired,
  index: PropTypes.number.isRequired,
};

export default function TextEditorControls(props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [formats, setFormats] = React.useState(() => []);
  const [editorVisible, setEditorVisible] = React.useState(true);
  const [alignment, setAlignment] = React.useState('center');
  const [alignmentAnchorEl, setAlignmentAnchorEl] = React.useState(null);
  const [colorAnchorEl, setColorAnchorEl] = React.useState(null);

  const handleFormat = (event, newFormats) => {
    const clickedFormat = event?.currentTarget?.value;
    if (props.handleStyle) {
      props.handleStyle(props.index, newFormats, clickedFormat);
    }
    setFormats(newFormats);
  };

  React.useEffect(() => {
    if (props.activeFormats) {
      const normalized = props.activeFormats.map((format) => (
        format === 'underlined' ? 'underline' : format
      ));
      setFormats(normalized);
    }
  }, [props.activeFormats]);

  const handleAlignmentClick = (event) => {
    setAlignmentAnchorEl(event.currentTarget);
  };

  const handleAlignmentClose = () => {
    setAlignmentAnchorEl(null);
  };

  const handleAlignmentChange = (newAlignment) => {
    setAlignment(newAlignment);
    props.handleAlignment(props.index, newAlignment);
    handleAlignmentClose();
  };

  const handleColorClick = (event) => {
    setColorAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setColorAnchorEl(null);
  };

  const handleColorChange = (colorType, event) => {
    const anchorEl = colorAnchorEl || event?.currentTarget || null;
    props.showColorPicker(colorType, props.index, anchorEl);
    handleColorClose();
  };

  return (
    <Box sx={{ mb: 0.75 }}>
      {props.showHeader !== false ? (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h5" marginY={1}>
            <b>Layer {props.index + 1} (caption)</b>
          </Typography>
          <IconButton
            size="small"
            color={editorVisible ? 'primary' : 'default'}
            onClick={() => setEditorVisible((prev) => !prev)}
            sx={{ marginLeft: 1 }}
          >
            <Settings />
          </IconButton>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.25 }}>
          <IconButton
            size="small"
            color={editorVisible ? 'primary' : 'default'}
            onClick={() => setEditorVisible((prev) => !prev)}
            sx={{ marginLeft: 1 }}
          >
            <Settings />
          </IconButton>
        </Box>
      )}

      {editorVisible && (
        <Box
          sx={{
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
            pb: 0.5,
            mx: isMobile ? -0.5 : 0,
            px: isMobile ? 0.5 : 0,
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, minWidth: 'max-content' }}>
            <ToggleButtonGroup
              value={formats}
              onChange={handleFormat}
              aria-label="text formatting"
              size="small"
              sx={{
                flexWrap: 'nowrap',
                '& .MuiToggleButton-root': {
                  minWidth: isMobile ? 36 : 40,
                },
              }}
            >
              <ToggleButton value="bold" aria-label="bold">
                <FormatBoldIcon />
              </ToggleButton>
              <ToggleButton value="italic" aria-label="italic">
                <FormatItalicIcon />
              </ToggleButton>
              <ToggleButton value="underline" aria-label="underline">
                <FormatUnderlinedIcon />
              </ToggleButton>
              <ToggleButton
                value="fontsize"
                aria-label="fontsize"
                selected={props.fontSizePickerShowing === props.index}
                onClick={props.showFontSizePicker}
              >
                <FormatSizeRounded />
              </ToggleButton>
              <ToggleButton value="alignment" aria-label="alignment" onClick={handleAlignmentClick}>
                {alignment === 'left' && <FormatAlignLeftIcon />}
                {alignment === 'center' && <FormatAlignCenterIcon />}
                {alignment === 'right' && <FormatAlignRightIcon />}
              </ToggleButton>
              <ToggleButton value="color" aria-label="color" onClick={handleColorClick}>
                <FormatColorFillIcon style={{ color: props.layerColor || 'inherit' }} />
                <ArrowDropDownIcon />
              </ToggleButton>
            </ToggleButtonGroup>

            <Box sx={{ width: isMobile ? 158 : 190, flexShrink: 0 }}>
              <FontSelector
                selectedFont={props.layerFonts[props.index] || 'Arial'}
                onSelectFont={(font, index) => {
                  props.setLayerFonts({ ...props.layerFonts, [index]: font });
                  props.handleFontChange(index, font);
                }}
                index={props.index}
              />
            </Box>
          </Box>

          <Menu anchorEl={alignmentAnchorEl} open={Boolean(alignmentAnchorEl)} onClose={handleAlignmentClose}>
            <MenuItem onClick={() => handleAlignmentChange('left')}>
              <FormatAlignLeftIcon />
            </MenuItem>
            <MenuItem onClick={() => handleAlignmentChange('center')}>
              <FormatAlignCenterIcon />
            </MenuItem>
            <MenuItem onClick={() => handleAlignmentChange('right')}>
              <FormatAlignRightIcon />
            </MenuItem>
          </Menu>
          <Menu anchorEl={colorAnchorEl} open={Boolean(colorAnchorEl)} onClose={handleColorClose}>
            <MenuItem
              onClick={(event) => {
                handleColorChange('text', event);
              }}
            >
              <FormatColorTextIcon style={{ marginRight: '8px', color: props.layerColor || 'inherit' }} />
              Text Color
            </MenuItem>
            <MenuItem onClick={(event) => handleColorChange('stroke', event)}>
              <BorderColorIcon style={{ marginRight: '8px', color: props.layerStrokeColor || 'inherit' }} />
              Stroke Color
            </MenuItem>
          </Menu>
        </Box>
      )}
    </Box>
  );
}
