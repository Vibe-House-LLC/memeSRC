// TextEditorControls.js

import * as React from 'react';
import PropTypes from 'prop-types';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { FontDownloadOutlined, FormatSizeRounded, MoreHoriz, Settings } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import { Button, Chip, MenuItem, Select, Typography } from '@mui/material';

// Prop types
TextEditorControls.propTypes = {
    handleStyle: PropTypes.func,
    index: PropTypes.number,
    fontSizePickerShowing: PropTypes.bool,
    showFontSizePicker: PropTypes.func,
    colorPickerShowing: PropTypes.bool,
    showColorPicker: PropTypes.func,
    handleFontChange: PropTypes.func,
};

const fonts = ["Arial", "Courier New", "Georgia", "Verdana", "Akbar", "PULPY", "scrubs", "SPIDEY", "HORROR", "Star Jedi"];

const FontSelector = ({ selectedFont, onSelectFont, index }) => {
    return (
      <Select
        value={selectedFont || 'Arial'}
        onChange={(e) => onSelectFont(e.target.value, index)}
        displayEmpty
        inputProps={{ 'aria-label': 'Without label' }}
        size='small'
        startAdornment={<FontDownloadOutlined sx={{ mr: 0.5 }} />}
        sx={{
          '& .MuiSelect-select': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          },
        }}
      >
        {fonts.map((font) => (
          <MenuItem key={font} value={font} sx={{ fontFamily: font }}>{font}</MenuItem>
        ))}
      </Select>
    );
};

export default function TextEditorControls(props) {
    const [formats, setFormats] = React.useState(() => []);
    const [editorVisible, setEditorVisible] = React.useState(false);

    const handleFormat = (event, newFormats) => {
        console.log("HANDLE FORMAT EVENT:", event)
        console.log("HANDLE FORMAT newFormats:", newFormats)
        setFormats(newFormats);
        props.handleStyle(props.index, newFormats);
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h5" marginY={1}><b>Layer {props.index+1} (caption)</b></Typography>
                <IconButton
                    size="small"
                    color={editorVisible ? "primary" : "default"}
                    onClick={() => setEditorVisible(prev => !prev)}
                    sx={{ marginLeft: 1 }}
                    >
                    <Settings />
                </IconButton>

            </div>

            {editorVisible && (
                <>
                    <ToggleButtonGroup
                        value={formats}
                        onChange={handleFormat}
                        aria-label="text formatting"
                        size='small'
                        sx={{ marginBottom: '12px' }}
                    >
                        <ToggleButton value="bold" aria-label="bold">
                            <FormatBoldIcon />
                        </ToggleButton>
                        <ToggleButton value="italic" aria-label="italic">
                            <FormatItalicIcon />
                        </ToggleButton>
                        <ToggleButton value="underlined" aria-label="underlined">
                            <FormatUnderlinedIcon />
                        </ToggleButton>
                        <ToggleButton value="fontsize" aria-label="fontsize" selected={(props.fontSizePickerShowing === props.index)} onClick={props.showFontSizePicker}>
                            <FormatSizeRounded />
                        </ToggleButton>
                        <ToggleButton value="color" aria-label="color" selected={(props.colorPickerShowing === props.index)} onClick={props.showColorPicker}>
                            <FormatColorFillIcon />
                            <ArrowDropDownIcon />
                        </ToggleButton>
                    </ToggleButtonGroup>
                    <FontSelector
                        selectedFont={props.layerFonts[props.index] || 'Arial'}
                        onSelectFont={(font, index) => {
                            props.setLayerFonts({ ...props.layerFonts, [index]: font })
                            props.handleFontChange(index, font)
                        }}
                        index={props.index}
                    />
                </>
            )}
        </div>
    );
}
