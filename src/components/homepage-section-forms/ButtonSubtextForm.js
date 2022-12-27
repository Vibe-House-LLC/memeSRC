import { TextField } from "@mui/material";
import React from "react";
import PropTypes from 'prop-types'

ButtonSubtextForm.propTypes = {
  buttonSubtext: PropTypes.object,
  setButtonSubtext: PropTypes.func
}

export default function ButtonSubtextForm({ buttonSubtext, setButtonSubtext }) {
  console.log(buttonSubtext)
  const handleChange = (event) => {
    setButtonSubtext({
      ...buttonSubtext,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <>
      <TextField
        label="Text"
        fullWidth
        name="text"
        value={buttonSubtext.text}
        onChange={handleChange}
      />
      <TextField
        label="Href"
        fullWidth
        name="href"
        value={buttonSubtext.href}
        onChange={handleChange}
      />
    </>
  );
};
