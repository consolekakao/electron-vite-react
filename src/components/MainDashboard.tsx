import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Drawer,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  AccountCircle,
  Dashboard,
  Assessment,
  Settings,
  ExitToApp,
  Notifications,
  TrendingUp,
  People,
  WorkOutline,
  Menu as MenuIcon,
} from '@mui/icons-material';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface MainDashboardProps {
  user: User;
  onLogout: () => void;
}

const MainDashboard: React.FC<MainDashboardProps> = ({ user, onLogout }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleClose();
    onLogout();
  };

  const dashboardCards = [
    {
      title: '총 프로젝트',
      value: '24',
      change: '+12%',
      icon: <WorkOutline sx={{ fontSize: { xs: 32, md: 40 }, color: 'primary.main' }} />,
      color: 'rgba(44, 62, 80, 0.1)',
    },
    {
      title: '활성 사용자',
      value: '1,234',
      change: '+8%',
      icon: <People sx={{ fontSize: { xs: 32, md: 40 }, color: '#27ae60' }} />,
      color: 'rgba(39, 174, 96, 0.1)',
    },
    {
      title: '월간 수익',
      value: '₩12,345,678',
      change: '+23%',
      icon: <TrendingUp sx={{ fontSize: { xs: 32, md: 40 }, color: '#f39c12' }} />,
      color: 'rgba(243, 156, 18, 0.1)',
    },
    {
      title: '완료율',
      value: '87%',
      change: '+5%',
      icon: <Assessment sx={{ fontSize: { xs: 32, md: 40 }, color: '#3498db' }} />,
      color: 'rgba(52, 152, 219, 0.1)',
    },
  ];

  const recentActivities = [
    { id: 1, activity: '새로운 프로젝트가 생성되었습니다', time: '5분 전' },
    { id: 2, activity: '사용자 김철수가 로그인했습니다', time: '10분 전' },
    { id: 3, activity: '보고서가 생성되었습니다', time: '1시간 전' },
    { id: 4, activity: '시스템 업데이트가 완료되었습니다', time: '2시간 전' },
  ];

  const menuItems = [
    { text: '대시보드', icon: <Dashboard /> },
    { text: '프로젝트 관리', icon: <WorkOutline /> },
    { text: '사용자 관리', icon: <People /> },
    { text: '모니터링', icon: <Assessment /> },
    { text: '설정', icon: <Settings /> },
  ];

  const drawerWidth = 280;

  const drawer = (
    <Box sx={{ overflow: 'auto', height: '100%' }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
          메뉴
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1 }}>
        {menuItems.map((item, index) => (
          <ListItem 
            button 
            key={index}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&:hover': {
                backgroundColor: 'primary.light',
                '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                  color: 'primary.contrastText',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            관리 시스템
          </Typography>
          
          <IconButton
            size="large"
            aria-label="notifications"
            color="inherit"
            sx={{ mr: 1 }}
          >
            <Notifications />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
            {!isMobile && (
              <Typography variant="body1" sx={{ mr: 1, fontWeight: 500 }}>
                {user.name}
              </Typography>
            )}
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  minWidth: 180,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                },
              }}
            >
              <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
                <AccountCircle sx={{ mr: 2, color: 'text.secondary' }} />
                프로필
              </MenuItem>
              <MenuItem onClick={handleClose} sx={{ py: 1.5 }}>
                <Settings sx={{ mr: 2, color: 'text.secondary' }} />
                설정
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
                <ExitToApp sx={{ mr: 2 }} />
                로그아웃
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 사이드바 */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            {drawer}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                borderRight: '1px solid',
                borderColor: 'divider',
                top: 0,
                height: '100vh',
                position: 'fixed',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        )}
      </Box>

      {/* 메인 콘텐츠 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ py: 4, px: { xs: 2, sm: 3 } }}>
          {/* 대시보드 카드들 */}
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
            {dashboardCards.map((card, index) => (
              <Grid item xs={12} sm={6} lg={3} key={index}>
                <Card 
                  sx={{ 
                    height: '100%',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                      <Box
                        sx={{
                          p: { xs: 1, md: 1.5 },
                          borderRadius: 3,
                          backgroundColor: card.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Box sx={{ ml: 'auto' }}>
                        <Typography
                          variant="caption"
                          sx={{ 
                            color: '#27ae60', 
                            fontWeight: 600,
                            backgroundColor: 'rgba(39, 174, 96, 0.1)',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          {card.change}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography 
                      variant="h4" 
                      component="div" 
                      gutterBottom
                      sx={{ 
                        fontSize: { xs: '1.5rem', md: '2rem' },
                        fontWeight: 700,
                        color: 'text.primary',
                      }}
                    >
                      {card.value}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: 'text.secondary',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                      }}
                    >
                      {card.title}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* 최근 활동 */}
          <Paper 
            sx={{ 
              p: { xs: 2, md: 3 },
              borderRadius: 3,
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontWeight: 600,
                mb: 3,
                color: 'text.primary',
              }}
            >
              최근 활동
            </Typography>
            <List sx={{ p: 0 }}>
              {recentActivities.map((activity, index) => (
                <ListItem 
                  key={activity.id} 
                  divider={index !== recentActivities.length - 1}
                  sx={{ 
                    px: 0,
                    py: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(44, 62, 80, 0.02)',
                      borderRadius: 2,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    <Avatar 
                      sx={{ 
                        width: 36, 
                        height: 36, 
                        bgcolor: 'primary.main',
                        '& .MuiSvgIcon-root': {
                          fontSize: 18,
                        },
                      }}
                    >
                      <Notifications />
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.activity}
                    secondary={activity.time}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                    }}
                    secondaryTypographyProps={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Container>
      </Box>
    </Box>
  );
};

export default MainDashboard;