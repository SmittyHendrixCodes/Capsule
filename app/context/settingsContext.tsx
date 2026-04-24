import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModuleType } from '../types/receipt';

interface SettingsContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  defaultModule: ModuleType;
  setDefaultModule: (value: ModuleType) => void;
  defaultExportFormat: 'csv' | 'xml' | 'pdf';
  setDefaultExportFormat: (value: 'csv' | 'xml' | 'pdf') => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType>({
  darkMode: false,
  setDarkMode: () => {},
  defaultModule: 'general',
  setDefaultModule: () => {},
  defaultExportFormat: 'pdf',
  setDefaultExportFormat: () => {},
  notificationsEnabled: true,
  setNotificationsEnabled: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkModeState] = useState(false);
  const [defaultModule, setDefaultModuleState] = useState<ModuleType>('general');
  const [defaultExportFormat, setDefaultExportFormatState] = useState<'csv' | 'xml' | 'pdf'>('pdf');
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const dm = await AsyncStorage.getItem('setting_darkMode');
      const mod = await AsyncStorage.getItem('setting_defaultModule');
      const fmt = await AsyncStorage.getItem('setting_defaultExportFormat');
      const notif = await AsyncStorage.getItem('setting_notifications');

      if (dm !== null) setDarkModeState(dm === 'true');
      if (mod !== null) setDefaultModuleState(mod as ModuleType);
      if (fmt !== null) setDefaultExportFormatState(fmt as 'csv' | 'xml' | 'pdf');
      if (notif !== null) setNotificationsEnabledState(notif === 'true');
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const setDarkMode = async (value: boolean) => {
    setDarkModeState(value);
    await AsyncStorage.setItem('setting_darkMode', String(value));
  };

  const setDefaultModule = async (value: ModuleType) => {
    setDefaultModuleState(value);
    await AsyncStorage.setItem('setting_defaultModule', value);
  };

  const setDefaultExportFormat = async (value: 'csv' | 'xml' | 'pdf') => {
    setDefaultExportFormatState(value);
    await AsyncStorage.setItem('setting_defaultExportFormat', value);
  };

  const setNotificationsEnabled = async (value: boolean) => {
    setNotificationsEnabledState(value);
    await AsyncStorage.setItem('setting_notifications', String(value));
  };

  return (
    <SettingsContext.Provider value={{
      darkMode,
      setDarkMode,
      defaultModule,
      setDefaultModule,
      defaultExportFormat,
      setDefaultExportFormat,
      notificationsEnabled,
      setNotificationsEnabled,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};