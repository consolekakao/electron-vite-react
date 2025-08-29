import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Login as LoginIcon } from '@mui/icons-material';

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await onLogin(username, password);
      if (!success) {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
        },
      }}
    >
      <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 4,
          }}
        >
          <Card 
            sx={{ 
              width: '100%', 
              maxWidth: 480, 
              p: { xs: 2, md: 4 },
              borderRadius: 4,
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    boxShadow: '0 8px 32px rgba(44, 62, 80, 0.3)',
                  }}
                >
                  <LoginIcon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography 
                  component="h1" 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 700, 
                    color: 'text.primary',
                    mb: 1,
                  }}
                >
                  로그인
                </Typography>
                <Typography 
                  variant="body1" 
                  color="text.secondary"
                  sx={{ textAlign: 'center' }}
                >
                  계정에 로그인하여 서비스를 이용하세요
                </Typography>
              </Box>
              
              {error && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-message': {
                      fontSize: '0.875rem',
                    },
                  }}
                >
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="아이디"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  sx={{
                    mb: 2,
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    },
                    '& .MuiOutlinedInput-input': {
                      fontSize: '0.875rem',
                      py: 1.5,
                    },
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="비밀번호"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  sx={{
                    mb: 3,
                    '& .MuiInputLabel-root': {
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    },
                    '& .MuiOutlinedInput-input': {
                      fontSize: '0.875rem',
                      py: 1.5,
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none',
                    boxShadow: '0 4px 12px rgba(44, 62, 80, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(44, 62, 80, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      backgroundColor: 'rgba(44, 62, 80, 0.5)',
                      color: 'white',
                    },
                  }}
                >
                  {loading ? '로그인 중...' : '로그인'}
                </Button>
              </Box>

              <Box 
                sx={{ 
                  mt: 4, 
                  p: 2.5,
                  backgroundColor: 'rgba(44, 62, 80, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(44, 62, 80, 0.1)',
                }}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'text.secondary',
                    textAlign: 'center',
                    mb: 1,
                    fontWeight: 500,
                  }}
                >
                  테스트 계정
                </Typography>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="caption" 
                    component="div"
                    sx={{ 
                      color: 'primary.main',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(44, 62, 80, 0.1)',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      display: 'inline-block',
                      mb: 0.5,
                    }}
                  >
                    admin / password123
                  </Typography>
                  <Typography 
                    variant="caption" 
                    component="div"
                    sx={{ 
                      color: 'primary.main',
                      fontFamily: 'monospace',
                      backgroundColor: 'rgba(44, 62, 80, 0.1)',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      display: 'inline-block',
                    }}
                  >
                    user1 / user123
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;