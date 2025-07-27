import { Close, Search } from "@mui/icons-material";
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { API } from "aws-amplify";
import { useRef, useState } from "react";
import PropTypes from 'prop-types';

const StyledList = styled('li')``

export default function TvdbSearch({ onSelect = () => {}, onClear = () => {}, typeFilter = [] }) {
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const searchField = useRef();
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = async () => {
        if (searchTerm === "") {
            setOptions([]);
            return;
        }
        setOpen(true)
        setLoading(true)
        const searchResults = await API.get("publicapi", "/tvdb/search", {
            queryStringParameters: {
                query: searchTerm,
            },
        });
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
            setOptions(mappedResults);
        }
        setLoading(false);
    }

    const handleSelection = (selection) => {
        setOpen(false)
        onSelect(selection)
    }

    const handleTextboxFocus = () => {
        if (options && options.length > 0) {
            setOpen(true)
        }
    }

    // const handleInputChange = async (event) => {
    //     if (event.target.value === "") {
    //         setOptions([]);
    //         return;
    //     }

    //     setLoading(true);

    //     clearTimeout(debounceTimeoutRef.current);

    //     debounceTimeoutRef.current = setTimeout(async () => {
    //         const searchResults = await API.get("publicapi", "/tvdb/search", {
    //             queryStringParameters: {
    //                 query: event.target.value,
    //             },
    //         });

    //         if (event.target.value === searchField.current.value) {
    //             if (searchResults?.length > 0) {
    //                 let filteredResults = searchResults;

    //                 // Modified the filter condition to work with an array of types
    //                 if (typeFilter.length > 0) {
    //                     filteredResults = filteredResults.filter(obj => typeFilter.includes(obj.type));
    //                 }

    //                 const mappedResults = filteredResults.map((result) => ({
    //                     id: result.tvdb_id,
    //                     label: result.name,
    //                     fullResult: result
    //                 }));
    //                 setTvdbResponse(filteredResults);
    //                 setOptions(mappedResults);
    //             }
    //             setLoading(false);
    //         } else {
    //             handleInputChange(searchField.current.value);
    //         }
    //     }, 500);
    // };

    return (
        <>
            {/* // <Autocomplete
        //     id="my-autocomplete"
        //     freeSolo
        //     open={open}
        //     onOpen={() => setOpen(true)}
        //     options={options}
        //     loading={loading}
        //     onChange={(event, value) => {
        //         if (value?.id) {
        //             console.log(value.fullResult)
        //             onSelect(value.fullResult)
        //         }
        //         setOpen(false)
        //     }}
        //     getOptionLabel={(option) => option.label}
        //     renderOption={(props, option) => {
        //         return (
        //             <li {...props} key={option.id} style={{ display: 'flex', alignItems: 'center' }}>
        //                 <img
        //                     src={option.fullResult.image_url}
        //                     alt={option.label}
        //                     style={{ height: '100px', marginRight: '10px' }}
        //                 />
        //                 <div style={{ paddingLeft: 8 }}>
        //                     <span style={{ fontWeight: 700 }}>{option.label}</span>
        //                     <p style={{ margin: 0, padding: 0, fontSize: 14 }}>{option.fullResult.overview}</p>
        //                 </div>
        //             </li>
        //         );
        //     }}
        //     renderInput={(params) => (
        //         <TextField
        //             {...params}
        //             inputRef={searchField}
        //             label="Search"
        //             variant="outlined"
        //             value={searchTerm}
        //             onChange={(event) => {
        //                 setSearchTerm(event.target.value)
        //             }}
        //             onKeyDown={(event) => {
        //                 if (event.key === 'Enter') {
        //                     event.preventDefault();
        //                 }
        //             }}
        //             // onChange={handleInputChange}
        //             fullWidth
        //             sx={{ marginTop: 0.75 }}
        //             InputProps={{
        //                 ...params.InputProps,
        //                 onKeyDown: (event) => {
        //                     if (event.key === 'Enter') {
        //                         event.preventDefault();
        //                         handleSearch();
        //                     }
        //                 },
        //                 endAdornment: (
        //                     <>
        //                         <IconButton onClick={handleSearch}>
        //                             <Search />
        //                         </IconButton>
        //                         {params.InputProps.endAdornment}
        //                     </>
        //                 ),
        //             }}
        //             componentsProps={{
        //                 clearIndicator: {
        //                     onClick: () => {
        //                         setOptions([]);
        //                         onClear();
        //                         setOpen(false)
        //                         console.log('testing')
        //                     }
        //                 },
        //             }}
        //         />
        //     )}
        // /> */}

            <TextField
                fullWidth
                label='Search'
                value={searchTerm}
                onChange={(event) => {
                    setSearchTerm(event.target.value)
                    if (options && options.length > 0) {
                        setOptions([])
                        setOpen(false)
                    }
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        handleSearch();
                    }
                }}
                onFocus={handleTextboxFocus}
                sx={{
                    mt: 1
                }}
                ref={searchField}
                InputProps={{
                    endAdornment:
                        <>
                            <IconButton disabled={!searchTerm} onClick={handleSearch}>
                                <Search />
                            </IconButton>
                            {searchTerm &&
                                <IconButton
                                    onClick={() => {
                                        setSearchTerm('')
                                        setOptions([])
                                        setOpen(false)
                                        onClear()
                                    }}
                                >
                                    <Close />
                                </IconButton>
                            }
                        </>
                }}
            />
            <Popper
                open={open}
                anchorEl={searchField.current}
                placement="bottom-start"
                style={{ zIndex: 8000, position: 'absolute' }}
            >
                <Container maxWidth sx={{ width: searchField.current ? searchField.current.offsetWidth : null }} disableGutters>
                    <Paper elevation={3} style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                        {loading ?
                            <Typography variant="body1" p={1.5}>
                                Loading results...
                            </Typography>
                            :
                            <>
                                {options && options.length > 0 ?
                                    <>
                                        {options.map(option =>
                                            <StyledList key={option.id} onClick={() => { handleSelection(option.fullResult) }} sx={{ display: 'flex', alignItems: 'center', p: 1.5, '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer' } }}>
                                                <img
                                                    src={option.fullResult.image_url}
                                                    alt={option.label}
                                                    style={{ height: '100px', marginRight: '10px' }}
                                                />
                                                <div style={{ paddingLeft: 8 }}>
                                                    <span style={{ fontWeight: 700 }}>{option.label}</span>
                                                    <p style={{
                                                        margin: 0,
                                                        padding: 0,
                                                        fontSize: 14,
                                                        display: '-webkit-box',
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                        WebkitLineClamp: 3,
                                                    }}>
                                                        {option.fullResult.overview}
                                                    </p>
                                                </div>
                                            </StyledList>
                                        )}
                                    </>
                                    :
                                    <Typography variant="body1" p={1.5}>
                                        No results
                                    </Typography>
                                }
                            </>
                        }
                    </Paper>
                </Container>
            </Popper>
        </>
    );
}

TvdbSearch.propTypes = {
    onSelect: PropTypes.func,
    onClear: PropTypes.func,
    typeFilter: PropTypes.arrayOf(PropTypes.string),
};
