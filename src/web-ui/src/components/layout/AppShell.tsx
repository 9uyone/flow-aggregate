import { useEffect, useState } from 'react';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Chip,
  Tabs,
  Tab,
  Container,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Menu as MenuIcon,
  Assessment as AssessmentIcon,
  Storage as StorageIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { AnalyticsDashboard } from '../../features/analytics';
import { HistoryDataGrid } from '../../features/history';
import { ParserList } from '../../features/parsers';
import { useAuthStore } from '../../store/authStore';
import { useParserStore } from '../../store/parserStore';
import { useNavigate } from 'react-router-dom';
import { UserProfileMenu } from './UserProfileMenu';

type ViewType = 'overview' | 'history' | 'management';

interface TabPanelProps {
  children?: React.ReactNode;
  index: ViewType;
  value: ViewType;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export const AppShell: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentView, setCurrentView] = useState<ViewType>('overview');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  const { user, logout } = useAuthStore();
  const { fetchConfigs } = useParserStore();
  const navigate = useNavigate();

  useEffect(() => {
    void fetchConfigs();
  }, [fetchConfigs]);

  const handleViewChange = (_event: React.SyntheticEvent, newView: ViewType) => {
    setCurrentView(newView);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const toggleMobileDrawer = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const navigationItems = [
    { label: 'Overview', value: 'overview' as ViewType, icon: <AssessmentIcon /> },
    { label: 'History', value: 'history' as ViewType, icon: <HistoryIcon /> },
    { label: 'Management', value: 'management' as ViewType, icon: <StorageIcon /> },
  ];

  // Mobile Drawer Navigation
  const drawerContent = (
    <Box sx={{ width: 250, pt: 2 }}>
      <Box sx={{ px: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold" color="primary">
          Flow Aggregate
        </Typography>
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.value} disablePadding>
            <ListItemButton
              selected={currentView === item.value}
              onClick={() => {
                setCurrentView(item.value);
                setMobileDrawerOpen(false);
              }}
            >
              <ListItemIcon
                sx={{
                  color: currentView === item.value ? 'primary.main' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontWeight: currentView === item.value ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.default',
      }}
    >
      {/* AppBar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          width: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Toolbar disableGutters>
          <Container
            maxWidth="lg"
            sx={{
              px: { xs: 2, sm: 3 },
              minHeight: 64,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/* Mobile Menu Button */}
            {isMobile && (
              <IconButton
                edge="start"
                onClick={toggleMobileDrawer}
                sx={{ mr: 2, color: 'text.primary' }}
              >
                <MenuIcon />
              </IconButton>
            )}

            {/* Logo/Title */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <DashboardIcon
                sx={{
                  fontSize: 32,
                  mr: 1.5,
                  color: 'primary.main',
                }}
              />
              <Typography
                variant="h6"
                fontWeight="bold"
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Flow Aggregate
              </Typography>
            </Box>

            {/* Desktop Navigation Tabs */}
            {!isMobile && (
              <Tabs
                value={currentView}
                onChange={handleViewChange}
                sx={{
                  flexGrow: 1,
                  mx: 4,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    minHeight: 64,
                  },
                }}
              >
                <Tab
                  label="Overview"
                  value="overview"
                  icon={<AssessmentIcon />}
                  iconPosition="start"
                />
                <Tab
                  label="History"
                  value="history"
                  icon={<HistoryIcon />}
                  iconPosition="start"
                />
                <Tab
                  label="Management"
                  value="management"
                  icon={<StorageIcon />}
                  iconPosition="start"
                />
              </Tabs>
            )}

            {/* System Status Chip */}
            <Chip
              label="System Online"
              color="success"
              size="small"
              sx={{
                mr: 2,
                fontWeight: 600,
                display: { xs: 'none', sm: 'flex' },
              }}
            />

            {/* User Avatar */}
            <UserProfileMenu
              user={user}
              onLogout={handleLogout}
              size="medium"
              bordered
            />
          </Container>
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={toggleMobileDrawer}
          PaperProps={{
            sx: {
              backgroundColor: 'background.paper',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, py: { xs: 2, sm: 3, md: 4 } }}>
        <Container
          maxWidth="lg"
          sx={{
            px: { xs: 2, sm: 3 },
          }}
        >
          {/* Page Header */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {currentView === 'overview'
                ? 'Analytics Overview'
                : currentView === 'history'
                  ? 'Task History'
                  : 'Parser Management'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {currentView === 'overview'
                ? 'Monitor your data parsing platform performance and activity'
                : currentView === 'history'
                  ? 'Browse and filter execution logs for parser tasks'
                  : 'Configure and manage your data collection parsers'}
            </Typography>
          </Box>

          {/* View Panels */}
          <TabPanel value={currentView} index="overview">
            <AnalyticsDashboard />
          </TabPanel>

          <TabPanel value={currentView} index="history">
            <HistoryDataGrid />
          </TabPanel>

          <TabPanel value={currentView} index="management">
            <ParserList />
          </TabPanel>
        </Container>
      </Box>
    </Box>
  );
};
