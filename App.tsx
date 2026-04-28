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
import { SettingsProvider } from './app/context/settingsContext';
import { requestNotificationPermission, setupNotifications } from './app/services/notificationService';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './app/context/authContext';
import * as LocalAuthentication from 'expo-local-authentication';
import WelcomeScreen from './app/screens/welcomeScreen';
import OnboardingOverlay from './app/components/onboardingOverlay';

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

function RootNavigator() {
  const { user, isGuest, loading, ready } = useAuth();
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'Home' | 'Capture' | 'Ledger'>('Home');

  useEffect(() => {
    if (user && !biometricChecked) {
      checkBiometrics();
    }
  }, [user]);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      setShowBiometric(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Welcome back to Capsule',
        fallbackLabel: 'Use Password',
      });
      if (result.success) {
        setBiometricChecked(true);
        setShowBiometric(false);
      }
    } else {
      setBiometricChecked(true);
    }
  };

  const handleAuthComplete = async () => {
    const complete = await AsyncStorage.getItem('onboarding_complete');
    if (!complete) {
      setShowOnboarding(true);
    }
  };

  const handleNavigate = (screen: 'Home' | 'Capture' | 'Ledger') => {
    setCurrentScreen(screen);
  };

  if (loading || !ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#53727B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#DDDDDD" />
      </View>
    );
  }

  if (!user && !isGuest) {
    return <WelcomeScreen onAuthComplete={handleAuthComplete} />;
  }

  if (user && !biometricChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: '#53727B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#DDDDDD" />
        <Text style={{ color: '#fff', fontFamily: 'Poppins_400Regular', marginTop: 16 }}>
          Authenticating...
        </Text>
      </View>
    );
  }

  return (
    <>
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
          onComplete={async () => {
            await AsyncStorage.setItem('onboarding_complete', 'true');
            setShowOnboarding(false);
          }}
        />
      )}
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen;
      if (screen && navigationRef.current) {
        navigationRef.current.navigate(screen as never);
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
          {!fontsLoaded ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1C1C1E" />
          </View>
        ) : (
            <RootNavigator />
        )}
          </NavigationContainer>
        </SafeAreaProvider>
      </SettingsProvider>
    </AuthProvider>
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