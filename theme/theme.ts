// theme/theme.ts

export interface AppTheme {
  id: string;
  name: string;
  emoji: string;
  dark: boolean;

  // Backgrounds
  bg: string;
  surface: string;
  card: string;
  elevated: string;

  // Text
  text: string;
  textMuted: string;
  textSubtle: string;

  // Accent
  accent: string;
  accentText: string; // text on top of accent color

  // Semantic
  success: string;
  danger: string;
  warning: string;

  // Borders & Dividers
  border: string;
  divider: string;

  // UI Components
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  chip: string;
  chipSelected: string;
  chipText: string;
  chipSelectedText: string;

  // Nav / Header
  headerBg: string;
  headerText: string;
  headerTint: string;

  // Status bar
  statusBarStyle: 'light-content' | 'dark-content';
}

export const THEMES: AppTheme[] = [
  {
    id: 'fresh',
    name: 'Fresh',
    emoji: '🌿',
    dark: false,
    bg: '#F2F7F4',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    text: '#1A2E22',
    textMuted: '#5A7A65',
    textSubtle: '#9EB5A5',
    accent: '#2E9E60',
    accentText: '#FFFFFF',
    success: '#2E9E60',
    danger: '#E05252',
    warning: '#E09E30',
    border: '#D8EDE1',
    divider: '#EAF4EE',
    inputBg: '#F2F7F4',
    inputBorder: '#C5DFCE',
    placeholder: '#9EB5A5',
    chip: '#E6F2EC',
    chipSelected: '#2E9E60',
    chipText: '#2E9E60',
    chipSelectedText: '#FFFFFF',
    headerBg: '#FFFFFF',
    headerText: '#1A2E22',
    headerTint: '#2E9E60',
    statusBarStyle: 'dark-content',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌙',
    dark: true,
    bg: '#0D1117',
    surface: '#161B22',
    card: '#1C2330',
    elevated: '#21293A',
    text: '#E6EDF3',
    textMuted: '#8B949E',
    textSubtle: '#484F58',
    accent: '#58A6FF',
    accentText: '#0D1117',
    success: '#3FB950',
    danger: '#F85149',
    warning: '#D29922',
    border: '#30363D',
    divider: '#21262D',
    inputBg: '#0D1117',
    inputBorder: '#30363D',
    placeholder: '#484F58',
    chip: '#21262D',
    chipSelected: '#58A6FF',
    chipText: '#8B949E',
    chipSelectedText: '#0D1117',
    headerBg: '#161B22',
    headerText: '#E6EDF3',
    headerTint: '#58A6FF',
    statusBarStyle: 'light-content',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    emoji: '🌅',
    dark: false,
    bg: '#FFF8F4',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    text: '#2D1206',
    textMuted: '#8B4A20',
    textSubtle: '#C9906A',
    accent: '#E85D20',
    accentText: '#FFFFFF',
    success: '#3DAA6E',
    danger: '#D63030',
    warning: '#D99020',
    border: '#FFD9C4',
    divider: '#FFEEE6',
    inputBg: '#FFF8F4',
    inputBorder: '#FFCFB5',
    placeholder: '#C9906A',
    chip: '#FFE8DA',
    chipSelected: '#E85D20',
    chipText: '#E85D20',
    chipSelectedText: '#FFFFFF',
    headerBg: '#FFFFFF',
    headerText: '#2D1206',
    headerTint: '#E85D20',
    statusBarStyle: 'dark-content',
  },
  {
    id: 'grape',
    name: 'Grape',
    emoji: '🍇',
    dark: true,
    bg: '#140A1E',
    surface: '#1E1030',
    card: '#261440',
    elevated: '#301A50',
    text: '#F0E8FF',
    textMuted: '#9A78CC',
    textSubtle: '#5C3E80',
    accent: '#C084FC',
    accentText: '#140A1E',
    success: '#60D9A0',
    danger: '#F27575',
    warning: '#D4A028',
    border: '#3D2266',
    divider: '#2A1650',
    inputBg: '#140A1E',
    inputBorder: '#3D2266',
    placeholder: '#5C3E80',
    chip: '#261440',
    chipSelected: '#C084FC',
    chipText: '#9A78CC',
    chipSelectedText: '#140A1E',
    headerBg: '#1E1030',
    headerText: '#F0E8FF',
    headerTint: '#C084FC',
    statusBarStyle: 'light-content',
  },
  {
    id: 'arctic',
    name: 'Arctic',
    emoji: '❄️',
    dark: false,
    bg: '#EEF4FB',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    text: '#0D1E33',
    textMuted: '#4A6A8A',
    textSubtle: '#9BB4CC',
    accent: '#1A6FC4',
    accentText: '#FFFFFF',
    success: '#1E9E6E',
    danger: '#D94040',
    warning: '#C8880E',
    border: '#C8DCED',
    divider: '#E0EBF5',
    inputBg: '#EEF4FB',
    inputBorder: '#B5CEDF',
    placeholder: '#9BB4CC',
    chip: '#DDE9F5',
    chipSelected: '#1A6FC4',
    chipText: '#1A6FC4',
    chipSelectedText: '#FFFFFF',
    headerBg: '#FFFFFF',
    headerText: '#0D1E33',
    headerTint: '#1A6FC4',
    statusBarStyle: 'dark-content',
  },
  {
    id: 'ember',
    name: 'Ember',
    emoji: '🔥',
    dark: true,
    bg: '#120800',
    surface: '#1E0E00',
    card: '#2A1400',
    elevated: '#361A00',
    text: '#FFE8CC',
    textMuted: '#C4783A',
    textSubtle: '#6E3E10',
    accent: '#FF8C00',
    accentText: '#120800',
    success: '#4EC080',
    danger: '#FF4040',
    warning: '#FFB800',
    border: '#4A2A00',
    divider: '#2E1800',
    inputBg: '#120800',
    inputBorder: '#4A2A00',
    placeholder: '#6E3E10',
    chip: '#2A1400',
    chipSelected: '#FF8C00',
    chipText: '#C4783A',
    chipSelectedText: '#120800',
    headerBg: '#1E0E00',
    headerText: '#FFE8CC',
    headerTint: '#FF8C00',
    statusBarStyle: 'light-content',
  },
];

export const DEFAULT_THEME_ID = 'fresh';

// Shared shadow style factory
export const makeShadow = (theme: AppTheme, depth: 'sm' | 'md' | 'lg' = 'sm') => {
  const shadows = {
    sm: { shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 },
    md: { shadowOpacity: 0.10, shadowRadius: 6, elevation: 4 },
    lg: { shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  };
  return {
    shadowColor: theme.dark ? '#000' : '#2D4A3E',
    shadowOffset: { width: 0, height: depth === 'sm' ? 1 : depth === 'md' ? 2 : 4 },
    ...shadows[depth],
  };
};

// Common reusable style fragments
export const makeCommonStyles = (t: AppTheme) => ({
  screen: {
    flex: 1,
    backgroundColor: t.bg,
  },
  card: {
    backgroundColor: t.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: t.border,
    ...makeShadow(t, 'sm'),
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    color: t.textSubtle,
    marginBottom: 10,
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: t.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: t.inputBg,
    borderRadius: 10,
    padding: 13,
    fontSize: 15,
    color: t.text,
    borderWidth: 1,
    borderColor: t.inputBorder,
  },
  primaryButton: {
    backgroundColor: t.accent,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  primaryButtonText: {
    color: t.accentText,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  dangerButton: {
    backgroundColor: t.danger,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700' as const,
  },
  ghostButton: {
    backgroundColor: t.chip,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: t.border,
  },
  ghostButtonText: {
    color: t.textMuted,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginRight: 12,
  },
  placeholder: {
    backgroundColor: t.chip,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: t.textMuted,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: t.textSubtle,
    textAlign: 'center' as const,
  },
  chip: {
    backgroundColor: t.chip,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: t.chipSelected,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: t.chipText,
  },
  chipTextSelected: {
    color: t.chipSelectedText,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCard: {
    backgroundColor: t.surface,
    borderRadius: 18,
    padding: 22,
    width: '88%' as const,
    maxWidth: 420,
    borderWidth: 1,
    borderColor: t.border,
    ...makeShadow(t, 'lg'),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: t.text,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  divider: {
    height: 1,
    backgroundColor: t.divider,
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  spaceBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: t.chip,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: t.textMuted,
  },
});
