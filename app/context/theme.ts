export const getTheme = (darkMode: boolean) => ({
    background: darkMode ? '#1C1C1E' : '#53727B',
    card: darkMode ? '#2C2C2E' : '#FFFFFF',
    cardInner: darkMode ? '#3A3A3C' : '#F3F4F6',
    text: darkMode ? '#FFFFFF' : '#1C1C1E',
    subtext: darkMode ? 'rgba(255,255,255,0.6)' : '#1C1C1E',
    accent: '#DDDDDD',
    button: darkMode ? '#DDDDDD' : '#1C1C1E',
    buttonText: darkMode ? '#1C1C1E' : '#FFFFFF',
    summaryBar: darkMode ? '#2C2C2E' : '#1C1C1E',
    border: darkMode ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
    inputBg: darkMode ? 'rgba(255,255,255,0.08)' : '#FFFFFF',
    overlay: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    tabBar: '#1C1C1E',
    tabActive: '#DDDDDD',
    pill: darkMode ? '#2C2C2E' : 'rgba(255,255,255,0.12)',
  });
  
  export type Theme = ReturnType<typeof getTheme>;