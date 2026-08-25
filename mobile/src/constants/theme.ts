export const palette = {
  paper: '#F2F0E9', paperRaised: '#F7F5EF', surface: '#FBFAF6', white: '#FFFFFF',
  ink: '#111612', inkSoft: '#384039', muted: '#697169', faint: '#969C96',
  line: '#DCD8CD', lineStrong: '#C9C3B5', accent: '#0878BE', accentDark: '#075D94',
  accentDeep: '#064A76', accentTint: '#E5F3FB', accentMist: '#F0F8FD',
  success: '#2F6B4F', successTint: '#E6F0E9', info: '#2C5578', infoTint: '#E5EEF6',
  warning: '#9A6C24', warningTint: '#F7EEDA', danger: '#A33A2E', dangerTint: '#F8E6E2',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, hero: 48 } as const;
export const radius = { xs: 3, sm: 6, md: 12, lg: 20, pill: 999 } as const;
export const typography = {
  regular: 'InstrumentSans_400Regular', medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold', bold: 'InstrumentSans_700Bold',
  sans: 'InstrumentSans_400Regular', display: 'InstrumentSans_600SemiBold',
  mono: 'IBMPlexMono_500Medium',
} as const;
export const shadow = {
  shadowColor: palette.ink, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.055, shadowRadius: 24, elevation: 2,
} as const;
export const shadowLift = {
  shadowColor: palette.accentDeep, shadowOffset: { width: 0, height: 15 }, shadowOpacity: 0.14, shadowRadius: 28, elevation: 7,
} as const;
