import { Autocomplete, CircularProgress, Grid, TextField } from "@mui/material";
import { API } from "aws-amplify";
import { useRef, useState } from "react";

export default function TvdbSearch({onSelect = () => {}}) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tvdbResponse, setTvdbResponse] = useState([]);
    const searchField = useRef();
    const debounceTimeoutRef = useRef(null);

    const handleInputChange = async (event) => {
        if (event.target.value === "") {
            setOptions([]);
            return;
        }

        setLoading(true);

        clearTimeout(debounceTimeoutRef.current);

        debounceTimeoutRef.current = setTimeout(async () => {
            const searchResults = await API.get("publicapi", "/tvdb/search", {
                queryStringParameters: {
                    query: event.target.value,
                },
            });

            if (event.target.value === searchField.current.value) {
                if (searchResults?.length > 0) {
                    const mappedResults = searchResults.map((result) => ({
                        id: result.tvdb_id,
                        label: result.name,
                        fullResult: result
                    }));
                    setTvdbResponse(searchResults);
                    setOptions(mappedResults);
                }
                setLoading(false);
            } else {
                handleInputChange(searchField.current.value);
            }
        }, 500);
    };

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Autocomplete
                    id="my-autocomplete"
                    open={open}
                    onOpen={() => setOpen(true)}
                    onClose={() => setOpen(false)}
                    options={options}
                    loading={loading}
                    onChange={(event, value) => {
                        if (value?.id) {
                            console.log(value.fullResult)
                            onSelect(value.fullResult)
                        }
                    }}
                    getOptionLabel={(option) => option.label}
                    renderOption={(props, option) => {
                        return (
                            <li {...props} key={option.id}>
                                {option.label}
                            </li>
                        );
                    }}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            inputRef={searchField}
                            label="Search"
                            variant="outlined"
                            onChange={handleInputChange}
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {loading ? (
                                            <CircularProgress color="inherit" size={20} />
                                        ) : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                            componentsProps={{
                                clearIndicator: {
                                    onClick: () => {
                                        setOptions([]);
                                    }
                                }
                            }}
                        />
                    )}
                />
            </Grid>
        </Grid>
    );
}
