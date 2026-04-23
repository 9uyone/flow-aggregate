import { createTheme } from '@mui/material/styles';
import { darkComponentOverrides, lightComponentOverrides } from './componentOverrides';
import { themeTokens } from './tokens';

export const darkTheme = createTheme({
  palette: themeTokens.darkPalette,
  typography: {
    ...themeTokens.typography,
    button: themeTokens.darkButtonTypography,
  },
  shape: themeTokens.shape,
  components: darkComponentOverrides,
});

export const lightTheme = createTheme({
  palette: themeTokens.lightPalette,
  typography: themeTokens.typography,
  shape: themeTokens.shape,
  components: lightComponentOverrides,
});

export default darkTheme;
