import { TextField } from "@mui/material";
import React from "react";

const ButtonSubtextForm = ({ buttonSubtext, setButtonSubtext }) => {
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

export default ButtonSubtextForm;
