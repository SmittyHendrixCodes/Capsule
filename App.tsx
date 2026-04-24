import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import HomeScreen from './app/screens/homeScreen';
import CaptureScreen from './app/screens/captureScreen';
import LedgerScreen from './app/screens/ledgerScreen';
import OnboardingOverlay from './app/components/onboardingOverlay';
import { SettingsProvider } from './app/context/settingsContext';

const Tab = createMaterialTopTabNavigator();

function FloatingTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: insets.bottom - 12 }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;

          const icons: Record<string, string> = {
            Home: '⌂',
            Capture: '◎',
            Ledger: '≡',
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabIcon, isFocused && styles.tabIconActive]}>
                {icons[route.name]}
              </Text>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                {route.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'Home' | 'Capture' | 'Ledger'>('Home');
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    await AsyncStorage.removeItem('onboarding_complete'); // remove this line after testing
    const complete = await AsyncStorage.getItem('onboarding_complete');
    if (!complete) {
      setShowOnboarding(true);
    }
  };

  const handleNavigate = (screen: 'Home' | 'Capture' | 'Ledger') => {
    navigationRef.current?.navigate(screen as never);
    setCurrentScreen(screen);
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1C1C1E" />
      </View>
    );
  }

  return (
    <SettingsProvider>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navigationRef}
          onStateChange={() => {
            const route = navigationRef.current?.getCurrentRoute();
            if (route?.name) {
              setCurrentScreen(route.name as 'Home' | 'Capture' | 'Ledger');
            }
          }}
        >
          <Tab.Navigator
            tabBar={(props) => <FloatingTabBar {...props} />}
            tabBarPosition="bottom"
            screenOptions={{ 
              swipeEnabled: true,
              tabBarStyle: { display: 'none' },
              tabBarIndicatorStyle: { display: 'none' },
            }}
          >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Capture" component={CaptureScreen} />
            <Tab.Screen name="Ledger" component={LedgerScreen} />
          </Tab.Navigator>

          {showOnboarding && (
            <OnboardingOverlay
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              onComplete={() => setShowOnboarding(false)}
            />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#53727B',
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 32,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#DDDDDD',
  },
  tabIcon: {
    fontSize: 16,
    color: 'rgba(221,221,221,0.4)',
    fontFamily: 'Poppins_600SemiBold',
  },
  tabIconActive: {
    color: '#1C1C1E',
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(221,221,221,0.4)',
  },
  tabLabelActive: {
    color: '#1C1C1E',
  },
});