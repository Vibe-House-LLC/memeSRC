# TVDB Integration Notes

## Episode Titles on Frame Page
The `/frame` page now attempts to fetch the episode name from the TVDB API using the `memesrcTVDB` Lambda. It searches for the series title from the frame metadata, loads the corresponding season and episode details, and displays the episode name if found.

## Future Improvements
- **Expose TVDB IDs in Metadata**: The Amplify schema already stores a `tvdbid` for Series, Seasons and Episodes. Many of our existing `00_metadata.json` files do not surface this value, so the front-end must search by series name. Adding the id to the metadata (or exposing it via GraphQL) would avoid the initial search request.
- **Dedicated Lambda Endpoint**: Episode lookups currently require multiple lambda calls (search, series, season). A dedicated endpoint could take a series id, season number and episode number and return the episode data directly.
- **API Key Protection**: The `memesrcTVDB` function already proxies requests to the TVDB API. If additional endpoints are needed, they should be implemented within this function so the API key remains server-side.
