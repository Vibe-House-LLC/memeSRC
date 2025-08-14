import { Skeleton } from '@mui/material';
import styled from '@emotion/styled';
import type { FC } from 'react';

const StyledSkeleton = styled(Skeleton)`
  width: 100%;
  height: 100%;
  position: absolute;
`;

const ImageSkeleton: FC = () => <StyledSkeleton variant="rectangular" />;

export default ImageSkeleton;