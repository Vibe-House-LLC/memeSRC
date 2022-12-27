import { TextField } from "@mui/material";
import React from "react";
import PropTypes from 'prop-types'

BottomImageForm.propTypes = {
    bottomImage: PropTypes.object,
    setBottomImage: PropTypes.func
}

export default function BottomImageForm({ bottomImage, setBottomImage }) {
  const handleChange = (event) => {
    setBottomImage({
      ...bottomImage,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <>
      <TextField
        label="Alt"
        fullWidth
        name="alt"
        onChange={handleChange}
        value={bottomImage.alt}
      />
      <TextField
        label="Src"
        fullWidth
        name="src"
        onChange={handleChange}
        value={bottomImage.src}
      />
      <TextField
        label="Bottom Margin"
        fullWidth
        name="bottomMargin"
        onChange={handleChange}
        value={bottomImage.bottomMargin}
      />
    </>
  );
};
