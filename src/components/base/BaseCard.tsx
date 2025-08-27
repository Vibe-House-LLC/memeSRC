import React from 'react';
import Card, { CardProps } from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';

export interface BaseCardProps extends CardProps {
  padded?: boolean;
}

// Consistent card: optional padding, uses theme radius/shadow.
export const BaseCard: React.FC<BaseCardProps> = ({ padded = true, children, ...rest }) => {
  const content = padded ? <CardContent>{children}</CardContent> : children;
  return <Card {...rest}>{content}</Card>;
};

