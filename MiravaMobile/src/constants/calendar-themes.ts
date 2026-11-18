export interface ThemeDecoration {
  symbols: string[];
  color: string;
  particleCount?: number;
  effectType: 'tet' | 'trungthu' | 'muahe' | 'muadong' | 'giangsinh';
}

export interface CalendarTheme {
  name: string;
  themeKey: 'tet' | 'trungthu' | 'muahe' | 'muadong' | 'giangsinh';
  subtitle: string;
  background: string;
  card: string;
  accent: string;
  text: string;
  muted: string;
  navigationBackground: string;
  navigationBorder: string;
  bannerGradient: [string, string];
  decoration: ThemeDecoration;
}

export const calendarThemes: readonly CalendarTheme[] = [
  {
    name: 'Tết Nguyên Đán',
    themeKey: 'tet',
    subtitle: 'Xuân sắc khởi sắc · Khai hoa đắc lộc · Phúc thọ khang ninh',
    background: '#FAF0E8',
    card: '#FFF9F4',
    accent: '#B81D24', // Đỏ son cung đình
    text: '#42181B',
    muted: '#8A615D',
    navigationBackground: '#FFF9F4',
    navigationBorder: '#EED3B8',
    bannerGradient: ['#B81D24', '#7F0E13'],
    decoration: {
      symbols: ['🌸', '🏮', '✿', '✨', '❀', '🧧'],
      color: '#D49432',
      particleCount: 10,
      effectType: 'tet',
    },
  },
  {
    name: 'Trung Thu',
    themeKey: 'trungthu',
    subtitle: 'Rằm tháng Tám · Ánh nguyệt soi tỏ · Đoàn viên sum họp',
    background: '#F1F0F8',
    card: '#FBF9FE',
    accent: '#5E4FA2', // Tím ngọc hoàng hôn
    text: '#282142',
    muted: '#736B8D',
    navigationBackground: '#FBF9FE',
    navigationBorder: '#DFD8F3',
    bannerGradient: ['#4E3F8F', '#2E2360'],
    decoration: {
      symbols: ['🌕', '🏮', '✧', '✨', '✦', '⭐'],
      color: '#F5B041',
      particleCount: 9,
      effectType: 'trungthu',
    },
  },
  {
    name: 'Mùa Hè',
    themeKey: 'muahe',
    subtitle: 'Hạ nhật rạng ngời · Sen nở ngát hương · Nắng vàng rực rỡ',
    background: '#FFF9E8',
    card: '#FFFEFA',
    accent: '#D35400', // Cam nắng ấm áp
    text: '#3D2817',
    muted: '#8A735A',
    navigationBackground: '#FFFEFA',
    navigationBorder: '#F2DFB8',
    bannerGradient: ['#E67E22', '#B95300'],
    decoration: {
      symbols: ['☼', '🪷', '✨', '✦', '🌊', '🌿'],
      color: '#E59866',
      particleCount: 8,
      effectType: 'muahe',
    },
  },
  {
    name: 'Mùa Đông',
    themeKey: 'muadong',
    subtitle: 'Đông hàn tĩnh tại · Sương mờ băng tuyết · Bế tàng dưỡng sinh',
    background: '#EBF4F9',
    card: '#FBFDFF',
    accent: '#2B6A94', // Xanh băng tuyết trầm
    text: '#1B2F3D',
    muted: '#627C8E',
    navigationBackground: '#FBFDFF',
    navigationBorder: '#C9DCE8',
    bannerGradient: ['#3A7CA5', '#164E70'],
    decoration: {
      symbols: ['❄', '❅', '❆', '✧', '💎', '✨'],
      color: '#7FB3D5',
      particleCount: 12,
      effectType: 'muadong',
    },
  },
  {
    name: 'Giáng Sinh',
    themeKey: 'giangsinh',
    subtitle: 'Lễ hội an lành · Chuông reo hoan ca · Ánh sáng diệu kỳ',
    background: '#EDF5EE',
    card: '#FCFDFB',
    accent: '#B3262D', // Đỏ giáng sinh
    text: '#1C3224',
    muted: '#5F7365',
    navigationBackground: '#FCFDFB',
    navigationBorder: '#D0E2D4',
    bannerGradient: ['#B3262D', '#1E4D2B'],
    decoration: {
      symbols: ['🔔', '❄', '🎄', '⭐', '✨', '🎁'],
      color: '#27AE60',
      particleCount: 11,
      effectType: 'giangsinh',
    },
  },
] as const;
