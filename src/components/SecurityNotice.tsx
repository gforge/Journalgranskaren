import { Box, Paper, Typography } from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';

export const SecurityNotice = () => {
  const { t } = useTranslation();

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        mb: 4,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.04) 0%, rgba(15, 23, 42, 0.08) 100%)',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        maxWidth: '680px',
        mx: 'auto',
        textAlign: 'left',
      }}
    >
      <Box
        sx={{
          backgroundColor: 'primary.light',
          color: 'primary.contrastText',
          p: 1,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <LockOutlinedIcon fontSize="small" />
      </Box>
      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}>
          {t('securityNoticeTitle')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.4 }}>
          {t('securityNoticeDesc')}
        </Typography>
      </Box>
    </Paper>
  );
};
