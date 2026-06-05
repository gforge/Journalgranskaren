import { styled } from '@mui/material';

const gradientStyle = (direction: 'top' | 'bottom') =>
  `linear-gradient(to ${direction}, rgba(85, 64, 33, 0.15) 0%, transparent 40%, transparent 100%)`;

export const NoteContainerWithShader = styled('div')(
  ({
    topGradientHeight,
    bottomGradientHeight,
  }: {
    topGradientHeight: number;
    bottomGradientHeight: number;
  }) => ({
    marginLeft: 'auto',
    marginRight: 'auto',
    width: '100%',
    position: 'relative',
    overflowY: 'auto',
    height: '100%',
    '&::after': {
      content: '""',
      display: 'block',
      position: 'sticky',
      left: 0,
      right: 0,
      bottom: 0,
      height: `${bottomGradientHeight}px`,
      background: gradientStyle('top'),
      pointerEvents: 'none',
      zIndex: 2,
      transition: 'height 0.2s',
      borderRadius: '5px',
      filter: 'blur(2px)',
      marginBottom: '2px',
    },
    '&::before': {
      content: '""',
      display: 'block',
      position: 'sticky',
      left: 0,
      right: 0,
      top: 0,
      height: `${topGradientHeight}px`,
      background: gradientStyle('bottom'),
      pointerEvents: 'none',
      zIndex: 2,
      transition: 'height 0.2s',
      borderRadius: '5px',
      filter: 'blur(2px)',
      marginTop: '2px',
    },
  })
);
