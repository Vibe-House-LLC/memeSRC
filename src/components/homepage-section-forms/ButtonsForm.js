import { Grid, IconButton, TextField } from "@mui/material";
// import AddCircleOutlineIcon from "@material-ui/icons/AddCircleOutline";
import { AddCircleOutline, RemoveCircleOutline } from "@mui/icons-material";
import React, { useState } from "react";
import PropTypes from 'prop-types'

ButtonsForm.propTypes = {
    buttons: PropTypes.array,
    setButtons: PropTypes.func
}

export default function ButtonsForm({ buttons, setButtons }) {
    const [newButton, setNewButton] = useState({
        title: "",
        icon: "",
        destination: "",
    });

    const handleChange = (event, index) => {
        const updatedButtons = [...buttons];
        updatedButtons[index] = {
          ...updatedButtons[index],
          [event.target.name]: event.target.value,
        };
        setButtons(updatedButtons);
      };
      

    const handleAddButton = () => {
        setButtons([...buttons, newButton]);
        setNewButton({ title: "", icon: "", destination: "" });
    };

    const handleRemoveButton = (index) => {
        setButtons(buttons.filter((_, i) => i !== index));
    };

    return (
        <>
            {buttons.length > 0 ? buttons.map((button, index) => (
                <Grid container spacing={2} key={index}>
                    <Grid item xs={4}>
                        <TextField
                            label="Title"
                            fullWidth
                            name="title"
                            value={button.title}
                            onChange={(event) => handleChange(event, index)}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            label="Icon"
                            fullWidth
                            name="icon"
                            value={button.icon}
                            onChange={(event) => handleChange(event, index)}
                        />
                    </Grid>
                    <Grid item xs={4}>
                        <TextField
                            label="Destination"
                            fullWidth
                            name="destination"
                            value={button.destination}
                            onChange={(event) => handleChange(event, index)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <IconButton onClick={() => handleRemoveButton(index)}>
                            <RemoveCircleOutline />
                        </IconButton>
                    </Grid>
                </Grid>
            )) : "None"}
            <IconButton onClick={() => handleAddButton()}>
                <AddCircleOutline />
            </IconButton>
        </>
    )
}
