import { SxProps, Theme } from '@mui/material';

export const boxStyles: SxProps<Theme> = {
  marginTop: '4px',
  marginLeft: '6px',
  paddingLeft: '4px',
  borderRadius: '3px',
  borderLeft: '2px solid transparent',
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderLeftColor: 'rgba(0, 0, 0, 0.12)',
  },
  transition: 'background-color 0.12s ease, border-color 0.12s ease',
};
