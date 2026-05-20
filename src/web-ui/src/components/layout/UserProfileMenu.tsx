import { useState } from 'react';
import {
  Avatar,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import {
  //Settings as SettingsIcon,
  MonitorHeartOutlined as HealthIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types/auth';

interface UserProfileMenuProps {
  user: User | null;
  onLogout: () => void;
  size?: 'small' | 'medium';
  bordered?: boolean;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  user,
  onLogout,
  size = 'medium',
  bordered = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  const handleHealthOpen = () => {
    handleMenuClose();
    navigate('/health');
  };

  const avatarSize = size === 'small'
    ? { width: 32, height: 32 }
    : { width: 40, height: 40 };

  return (
    <>
      <IconButton
        onClick={handleMenuOpen}
        size={size}
        sx={{
          p: 0,
          border: bordered ? '2px solid' : 'none',
          borderColor: 'primary.main',
        }}
      >
        <Avatar
          src={user?.avatarUrl}
          alt={user?.name || 'User'}
          sx={{
            ...avatarSize,
            bgcolor: 'primary.main',
          }}
        >
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            minWidth: 200,
            borderRadius: 2,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {user?.name || 'Guest User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email || 'guest@example.com'}
          </Typography>
        </Box>
        <Divider />
        {/* <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem> */}
        <MenuItem onClick={handleHealthOpen}>
          <ListItemIcon>
            <HealthIcon fontSize="small" />
          </ListItemIcon>
          Health
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};
