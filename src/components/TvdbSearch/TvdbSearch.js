import { Autocomplete, CircularProgress, Grid, TextField } from "@mui/material";
import { API } from "aws-amplify";
import { useRef, useState } from "react";

export default function TvdbSearch({onSelect = () => {}, onClear = () => {}, typeFilter}) {
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
                    let filteredResults = searchResults;

                    // Modified the filter condition to work with an array of types
                    if (typeFilter.length > 0) {
                        filteredResults = filteredResults.filter(obj => typeFilter.includes(obj.type));
                    }

                    const mappedResults = filteredResults.map((result) => ({
                        id: result.tvdb_id,
                        label: result.name,
                        fullResult: result
                    }));
                    setTvdbResponse(filteredResults);
                    setOptions(mappedResults);
                }
                setLoading(false);
            } else {
                handleInputChange(searchField.current.value);
            }
        }, 500);
    };

    return (
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
                          <li {...props} key={option.id} style={{ display: 'flex', alignItems: 'center' }}>
                            <img
                              src={option.fullResult.image_url}
                              alt={option.label}
                              style={{ height: '100px', marginRight: '10px' }}
                            />
                            <div style={{paddingLeft: 8}}>
                              <span style={{fontWeight: 700}}>{option.label}</span>
                              <p style={{margin: 0, padding: 0, fontSize: 14}}>{option.fullResult.overview}</p>
                            </div>
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
                            fullWidth
                            sx={{marginTop: 0.75}}
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
                                        onClear();
                                    }
                                }
                            }}
                        />
                    )}
                />
    );
}
