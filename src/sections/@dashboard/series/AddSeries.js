import { Autocomplete, Button, CircularProgress, Grid, TextField, Typography } from "@mui/material";
import { API, graphqlOperation } from "aws-amplify";
import { useEffect, useState } from "react";
import { LoadingButton } from "@mui/lab";
import { useNavigate } from "react-router-dom";
import { createSeries } from '../../../graphql/mutations';


export default function AddSeries() {
    const navigate = useNavigate();
    const [tvdbResults, setTvdbResults] = useState([]);
    const [tvdbResultsLoading, setTvdbResultsLoading] = useState(true);
    const [tvdbSeriesData, setTvdbSeriesData] = useState();
    const [tvdbSearchQuery, setTvdbSearchQuery] = useState('');
    const [tvdbSearchOpen, setTvdbSearchOpen] = useState();
    const [tvdbid, setTvdbid] = useState('');
    const [seriesDescription, setSeriesDescription] = useState('');
    const [seriesSlug, setSlug] = useState('');
    const [seriesName, setSeriesName] = useState('');
    const [seriesYear, setSeriesYear] = useState('');
    const [seriesImage, setSeriesImage] = useState('');
    const [statusText, setStatusText] = useState('');
    const [tvdbSearchValue, setTvdbSearchValue] = useState('');
    const [seriesSeasons, setSeriesSeasons] = useState([]);
    const [loadingButton, setLoadingButton] = useState(false);

    const createNewSeries = () => {
        setLoadingButton(true);
        const seriesData = {
            tvdbid,
            description: seriesDescription,
            slug: seriesSlug,
            name: seriesName,
            year: parseInt(seriesYear, 10),
            image: seriesImage,
            statusText
        }

        API.graphql(
            graphqlOperation(createSeries, { input: seriesData })
        ).then((result) => {
            navigate('/dashboard/series');
        }).catch((error) => {
            console.log(error);
            loadingButton(false);
        });
    }

    const searchTvdb = async () => {
        setTvdbResultsLoading(true);
        await API.get('publicapi', '/tvdb/search', {
            'queryStringParameters': {
                'query': tvdbSearchQuery
            }
        }).then(results => {
            console.log(results)
            if (typeof results === 'object') {
                setTvdbResults(results);
                setTvdbResultsLoading(false);
            } else {
                setTvdbResults([]);
                setTvdbResultsLoading(false);
            }
        }).catch(error => console.log(error))
    }

    const getTvdbSeasons = async () => {
        await API.get('publicapi', `/tvdb/series/${tvdbid}/extended`)
            .then(results => {
                setSeriesSeasons(results.seasons);
                console.log(results.seasons)
            })
            .catch(error => console.log(error))
    }

    useEffect(() => {
        setTvdbResults([])
        const timeOutId = setTimeout(() => searchTvdb(), 100);
        return () => clearTimeout(timeOutId);
    }, [tvdbSearchQuery]);

    useEffect(() => {
        if (tvdbid !== '') {
            getTvdbSeasons();
        }
    }, [tvdbid]);

    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Autocomplete
                    id="series-search"
                    fullWidth
                    open={tvdbSearchOpen}
                    onOpen={() => {
                        setTvdbSearchOpen(true);
                    }}
                    onClose={() => {
                        setTvdbSearchOpen(false);
                    }}
                    isOptionEqualToValue={(tvdbResults, value) => tvdbResults.name === value.name}
                    getOptionLabel={(tvdbResults) => tvdbResults.name || ''}
                    noOptionsText="No Results Found"
                    autoHighlight
                    options={tvdbResults}
                    loading={tvdbResultsLoading}
                    loadingText="Searching..."
                    value={tvdbSearchValue}
                    onChange={(event, selected) => {
                        setTvdbSearchValue(selected);
                        if (typeof selected === 'object') {
                            setTvdbid(selected.tvdb_id);
                            setSeriesDescription(selected.overview);
                            setSlug(selected.slug);
                            setSeriesName(selected.name);
                            setSeriesYear(selected.year);
                            setSeriesImage(selected.image_url);
                            console.log(selected.tvdb_id);
                        } else {
                            setTvdbid('');
                            setSeriesDescription('');
                            setSlug('');
                            setSeriesName('');
                            setSeriesYear('');
                            setSeriesImage('');
                        }
                    }}
                    filterOptions={(x) => x}
                    renderInput={(params) => (
                        <TextField
                            value={tvdbSearchQuery}
                            onChange={(event) => {
                                setTvdbSearchQuery(event.target.value);
                            }}
                            {...params}
                            label="Search TVDB"
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <>
                                        {tvdbResultsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                    componentsProps={{
                        clearIndicator: {
                            onClick: () => {
                                setTvdbSearchValue('');
                                setTvdbid('');
                                setTvdbResults([]);
                                setTvdbSearchQuery('');
                                setSeriesDescription('');
                                setSlug('');
                                setSeriesName('');
                                setSeriesYear('');
                                setSeriesImage('');
                                setSeriesSeasons([]);
                            }
                        }
                    }}
                />
            </Grid>
            <Grid item xs={12} md={2}>
                <TextField
                    value={tvdbid}
                    disabled
                    fullWidth
                    label='TVDB ID'
                />
            </Grid>
            <Grid item xs={12} md={4}>
                <TextField
                    value={seriesName}
                    onChange={(event) => setSeriesName(event.target.value)}
                    fullWidth
                    label='Series Name'
                />
            </Grid>
            <Grid item xs={12} md={2}>
                <TextField
                    value={seriesYear}
                    onChange={(event) => setSeriesYear(event.target.value)}
                    fullWidth
                    label='Series Year'
                />
            </Grid>
            <Grid item xs={12} md={4}>
                <TextField
                    value={statusText}
                    onChange={(event) => setStatusText(event.target.value)}
                    fullWidth
                    label='Series Status'
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField
                    value={seriesImage}
                    onChange={(event) => setSeriesImage(event.target.value)}
                    fullWidth
                    label='Series Image'
                />
            </Grid>
            <Grid item xs={12} md={6}>
                <TextField
                    value={seriesSlug}
                    onChange={(event) => setSlug(event.target.value)}
                    fullWidth
                    label='Series Slug'
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                    value={seriesDescription}
                    onChange={(event) => setSeriesDescription(event.target.value)}
                    fullWidth
                    multiline
                    rows={5}
                    label='Series Description'
                />
            </Grid>
            <Grid item xs={12}>
                <LoadingButton variant="primary" loading={loadingButton} onClick={createNewSeries} disabled={(tvdbid === '' || !tvdbid || loadingButton)}>
                    Add Series
                </LoadingButton>
            </Grid>
            {seriesSeasons && seriesSeasons.map((season) =>
                (season.type.id === 1) ?
                    <Grid item xs={6} md={2}>
                        <img src={season.image} alt='season artwork' style={{ width: '100%', height: 'auto' }} />
                        <Typography component='h6' variant='h6'>
                            Season {season.number}
                        </Typography>
                    </Grid>
                    : null

            )}
        </Grid>
    )
}