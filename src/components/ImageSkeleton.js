import { Skeleton } from '@mui/material';
import styled from '@emotion/styled';

const StyledSkeleton = styled(Skeleton)`
  width: 100%;
  height: 100%;
  position: absolute;
`;

const ImageSkeleton = () => {
  return <StyledSkeleton variant="rectangular" />;
};

export default ImageSkeleton;
