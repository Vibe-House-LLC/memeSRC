import { TableRow, TableCell, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { SourceMedia } from '../types';

interface SourceMediaRowProps {
  sourceMedia: SourceMedia;
  onViewDetails: (id: string) => void;
}

const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  switch (status.toLowerCase()) {
    case 'uploaded':
      return 'warning';      // Orange - newly uploaded, needs review
    case 'pending':
      return 'info';         // Blue - awaiting processing
    case 'indexing':
      return 'primary';      // Purple/Blue - actively being processed
    case 'published':
      return 'success';      // Green - successfully completed and published
    case 'failed':
      return 'error';        // Red - processing failed
    case 'awaitingindexing':
      return 'warning';      // Orange - awaiting indexing
    default:
      return 'default';      // Gray - unknown status
  }
};

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function SourceMediaRow({ sourceMedia, onViewDetails }: SourceMediaRowProps) {
  return (
    <TableRow
      key={sourceMedia.id}
      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
      hover
    >
      <TableCell>
        <Chip
          label={sourceMedia.status}
          color={getStatusColor(sourceMedia.status)}
          size="small"
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {sourceMedia.user?.username || 'N/A'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2">
          {sourceMedia.series?.name || 'N/A'}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          {formatDate(sourceMedia.createdAt)}
        </Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          {formatDate(sourceMedia.updatedAt)}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Tooltip title="View Details">
          <IconButton
            size="small"
            onClick={() => onViewDetails(sourceMedia.id)}
            color="primary"
          >
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}
