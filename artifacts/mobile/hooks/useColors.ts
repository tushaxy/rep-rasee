import colors from '@/constants/colors';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * Returns design tokens for the active color scheme.
 * Respects the in-app theme override (light / dark / system)
 * set via ThemeContext, persisted across launches.
 */
export function useColors() {
  const { resolved } = useTheme();
  const palette = resolved === 'dark' ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
