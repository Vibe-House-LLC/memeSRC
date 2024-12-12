import React, { useState, useEffect } from 'react';
import { Container, Divider, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Button, TextField, CircularProgress, Pagination, Stack, Skeleton } from "@mui/material";
import { Storage } from 'aws-amplify';
import { Buffer } from 'buffer';
import sanitizeHtml from 'sanitize-html';
import { extractVideoFrames } from '../utils/videoFrameExtractor';

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
  const [frameImages, setFrameImages] = useState({});
  const [loadedImages, setLoadedImages] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues({ ...formValues, [name]: value });
  };

  const frameToTimeCode = (frame, frameRate = 10) => {
    const totalSeconds = frame / frameRate;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const fetchFrameImage = async (frame) => {
    try {
      const images = await extractVideoFrames(
        formValues.showId,
        formValues.season,
        formValues.episode,
        [frame],
        10,
        0.2 // Scale down the image for thumbnails
      );
      if (images && images.length > 0) {
        setFrameImages(prev => ({
          ...prev,
          [frame]: images[0]
        }));
      }
    } catch (error) {
      console.error('Error fetching frame image:', error);
    }
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

        const startFrame = parseInt(parts[4], 10);
        const endFrame = parseInt(parts[5], 10);
        const middleFrame = Math.round((startFrame + endFrame) / 2);

        return {
          season: parts[0],
          episode: parts[1],
          subtitle_index: parseInt(parts[2], 10),
          subtitle_text: sanitizedSubtitle,
          start_frame: startFrame,
          end_frame: endFrame,
          middle_frame: middleFrame,
        };
      });

      setSubtitles(parsedSubtitles);
      
      // Fetch images for visible subtitles
      parsedSubtitles
        .slice(0, rowsPerPage)
        .forEach(subtitle => fetchFrameImage(subtitle.middle_frame));
        
    } catch (error) {
      console.error("Error fetching subtitles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
    // Fetch images for the new page
    filteredSubtitles
      .slice(newPage * rowsPerPage, newPage * rowsPerPage + rowsPerPage)
      .forEach(subtitle => fetchFrameImage(subtitle.middle_frame));
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    // Fetch images for the new page size
    filteredSubtitles
      .slice(0, newRowsPerPage)
      .forEach(subtitle => fetchFrameImage(subtitle.middle_frame));
  };

  // Also add this effect to handle search changes
  useEffect(() => {
    if (filteredSubtitles.length > 0) {
      // Fetch images for current page when search results change
      filteredSubtitles
        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
        .forEach(subtitle => fetchFrameImage(subtitle.middle_frame));
    }
  }, [searchQuery, page, rowsPerPage]);

  const filteredSubtitles = subtitles.filter(subtitle =>
    subtitle.subtitle_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImageLoad = (frame) => {
    setLoadedImages(prev => ({
      ...prev,
      [frame]: true
    }));
  };

  const handleImageError = (frame) => {
    console.error(`Failed to load image for frame ${frame}`);
    setLoadedImages(prev => ({
      ...prev,
      [frame]: true // Mark as loaded even on error to prevent infinite skeleton
    }));
  };

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
              <TableCell><b>Thumbnail</b></TableCell>
              <TableCell><b>Start Time</b></TableCell>
              <TableCell><b>End Time</b></TableCell>
              <TableCell><b>Subtitle Text</b></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSubtitles
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((subtitle) => (
                <TableRow key={subtitle.subtitle_index}>
                  <TableCell>{subtitle.subtitle_index}</TableCell>
                  <TableCell style={{ width: 100 }}>
                    {frameImages[subtitle.middle_frame] && (
                      <img 
                        src={frameImages[subtitle.middle_frame]} 
                        alt={`Frame ${subtitle.middle_frame}`}
                        style={{ 
                          width: '100%', 
                          height: 'auto',
                          display: loadedImages[subtitle.middle_frame] ? 'block' : 'none'
                        }}
                        onLoad={() => handleImageLoad(subtitle.middle_frame)}
                        onError={() => handleImageError(subtitle.middle_frame)}
                      />
                    )}
                    {(!frameImages[subtitle.middle_frame] || !loadedImages[subtitle.middle_frame]) && (
                      <Skeleton 
                        variant="rectangular" 
                        width="100%" 
                        sx={{ 
                          paddingTop: '56.25%', // 16:9 aspect ratio
                          backgroundColor: 'rgba(255, 255, 255, 0.1)' 
                        }} 
                      />
                    )}
                  </TableCell>
                  <TableCell>{frameToTimeCode(subtitle.start_frame)}</TableCell>
                  <TableCell>{frameToTimeCode(subtitle.end_frame)}</TableCell>
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