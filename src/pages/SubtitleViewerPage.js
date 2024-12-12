import React, { useState } from 'react';
import { Container, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, TextField, CircularProgress, Pagination, Stack } from "@mui/material";
import { Storage } from 'aws-amplify';
import { Buffer } from 'buffer';
import sanitizeHtml from 'sanitize-html';

const SubtitleViewerPage = () => {
  const [loading, setLoading] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [formValues, setFormValues] = useState({
    showId: '',
    season: '',
    episode: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const fetchSubtitles = async () => {
    setLoading(true);
    try {
      const subtitlesDownload = await Storage.get(
        `src/${formValues.showId}/${formValues.season}/${formValues.episode}/_docs.csv`,
        { 
          level: 'public',
          download: true,
          customPrefix: { public: 'protected/' }
        }
      );

      const subtitlesCsv = await subtitlesDownload.Body.text();
      const parsedSubtitles = subtitlesCsv.split('\n').slice(1).map(line => {
        const parts = line.split(',');
        const subtitleText = parts[3] || '';
        let decodedSubtitle = '';
        let sanitizedSubtitle = '';

        try {
          decodedSubtitle = Buffer.from(subtitleText, 'base64').toString();
          sanitizedSubtitle = sanitizeHtml(decodedSubtitle, {
            allowedTags: [],
            allowedAttributes: {},
          });
        } catch (error) {
          console.error('Error decoding subtitle:', error);
        }

        return {
          season: parts[0],
          episode: parts[1],
          subtitle_index: parseInt(parts[2], 10),
          subtitle_text: sanitizedSubtitle,
          start_frame: parseInt(parts[4], 10),
          end_frame: parseInt(parts[5], 10),
        };
      });

      setSubtitles(parsedSubtitles);
    } catch (error) {
      console.error("Error fetching subtitles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredSubtitles = subtitles.filter(subtitle =>
    subtitle.subtitle_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="md">
      <Typography fontSize={30} fontWeight={700}>
        Subtitle Viewer
      </Typography>
      <Divider sx={{ my: 3 }} />
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          name="showId"
          label="Show ID"
          value={formValues.showId}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          name="season"
          label="Season"
          value={formValues.season}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          name="episode"
          label="Episode"
          value={formValues.episode}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <Button 
          variant="contained" 
          onClick={fetchSubtitles}
          disabled={loading || !formValues.showId || !formValues.season || !formValues.episode}
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Fetch Subtitles'}
        </Button>
      </Paper>

      {subtitles.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Search subtitles"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            margin="normal"
            placeholder="Type to filter subtitles..."
          />
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><b>Index</b></TableCell>
              <TableCell><b>Start Frame</b></TableCell>
              <TableCell><b>End Frame</b></TableCell>
              <TableCell><b>Subtitle Text</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSubtitles
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((subtitle) => (
                <TableRow key={subtitle.subtitle_index}>
                  <TableCell>{subtitle.subtitle_index}</TableCell>
                  <TableCell>{subtitle.start_frame}</TableCell>
                  <TableCell>{subtitle.end_frame}</TableCell>
                  <TableCell>{subtitle.subtitle_text}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <Stack spacing={2} alignItems="center" sx={{ p: 2 }}>
          <Pagination 
            count={Math.ceil(filteredSubtitles.length / rowsPerPage)}
            page={page + 1}
            onChange={(e, newPage) => setPage(newPage - 1)}
            color="primary"
            showFirstButton 
            showLastButton
          />
          <Typography variant="caption" color="text.secondary">
            Showing {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredSubtitles.length)} of {filteredSubtitles.length} items
          </Typography>
        </Stack>
      </TableContainer>
    </Container>
  );
};

export default SubtitleViewerPage; 