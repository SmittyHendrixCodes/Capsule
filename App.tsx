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
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './app/context/authContext';
import * as LocalAuthentication from 'expo-local-authentication';
import WelcomeScreen from './app/screens/welcomeScreen';
import OnboardingOverlay from './app/components/onboardingOverlay';
import ProfileScreen from './app/screens/profileScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from './app/utils/haptics';
import LoadingScreen from './app/screens/loadingScreen';
import { initializePurchases } from './app/services/purchaseService';
import { supabase } from './app/services/supabaseClient';

const Tab = createMaterialTopTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
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
  );
}

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

          if (!icons[route.name]) return null;

          const onPress = () => {
            hapticLight();
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
              {isFocused && (
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0.35)',
                    'rgba(255,255,255,0.05)',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.tabItemGloss}
                />
              )}
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

function RootNavigator({ 
  onShowOnboarding,
  onReplayOnboarding,
}: { 
  onShowOnboarding: () => void;
  onReplayOnboarding: () => void;
}) {
  const { user, isGuest, loading, ready } = useAuth();
  const [biometricChecked, setBiometricChecked] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);

  useEffect(() => {
    if (user) {
      initializePurchases(user.id);
    } else {
      initializePurchases();
    }
  }, [user]);

  useEffect(() => {
    if (user && !biometricChecked) {
      checkBiometrics();
      const timeout = setTimeout(() => {
        if (!biometricChecked) {
          setBiometricFailed(true);
        }
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [user]);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Welcome back to Capsule',
        fallbackLabel: 'Use Password',
      });
      if (result.success) {
        setBiometricChecked(true);
      } else {
        setBiometricFailed(true);
      }
    } else {
      setBiometricChecked(true);
    }
  };

  if (loading || !ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#53727B', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#DDDDDD" />
      </View>
    );
  }

  if (!user && !isGuest) {
    return (
      <WelcomeScreen
        onAuthComplete={async () => {
          const seen = await AsyncStorage.getItem('onboarding_complete');
          if (!seen) {
            onShowOnboarding();
          }
        }}
      />
    );
  }

  if (user && !biometricChecked) {
    if (biometricFailed) {
      supabase.auth.signOut();
      return (
        <WelcomeScreen
          onAuthComplete={async () => {
            const seen = await AsyncStorage.getItem('onboarding_complete');
            if (!seen) onShowOnboarding();
            setBiometricFailed(false);
            setBiometricChecked(true);
          }}
        />
      );
    }
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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main">
        {() => <TabNavigatorWithOnboarding onReplayOnboarding={onReplayOnboarding} />}
      </Stack.Screen>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
    </Stack.Navigator>
  );
}

function TabNavigatorWithOnboarding({ onReplayOnboarding }: { onReplayOnboarding: () => void }) {
  return (
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        tabBarStyle: { display: 'none' },
        tabBarIndicatorStyle: { display: 'none' },
      }}
    >
      <Tab.Screen name="Home">
        {() => <HomeScreen onReplayOnboarding={onReplayOnboarding} />}
      </Tab.Screen>
      <Tab.Screen name="Capture" component={CaptureScreen} />
      <Tab.Screen name="Ledger" component={LedgerScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [showLoading, setShowLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingScreen, setOnboardingScreen] = useState<'Home' | 'Capture' | 'Ledger'>('Home');
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (fontsLoaded) {
      setTimeout(() => setShowLoading(false), 2500);
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const screen = response.notification.request.content.data?.screen;
      if (screen && navigationRef.current) {
        navigationRef.current.navigate(screen as never);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    initializePurchases();
  }, []);

  const handleReplayOnboarding = async () => {
    await AsyncStorage.removeItem('onboarding_complete');
    setOnboardingScreen('Home');
    navigationRef.current?.navigate('Home' as never);
    setShowOnboarding(true);
  };

  return (
    <AuthProvider>
      <SettingsProvider>
        <SafeAreaProvider>
          <NavigationContainer ref={navigationRef}>
            {!fontsLoaded || showLoading ? (
              <LoadingScreen />
            ) : (
              <RootNavigator
                onShowOnboarding={() => setShowOnboarding(true)}
                onReplayOnboarding={handleReplayOnboarding}
              />
            )}
          </NavigationContainer>

          {showOnboarding && (
            <OnboardingOverlay
              currentScreen={onboardingScreen}
              onNavigate={(screen) => {
                setOnboardingScreen(screen as 'Home' | 'Capture' | 'Ledger');
                navigationRef.current?.navigate(screen as never);
              }}
              onComplete={async () => {
                await AsyncStorage.setItem('onboarding_complete', 'true');
                setShowOnboarding(false);
              }}
            />
          )}
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
  tabItemActive: {
    backgroundColor: '#DDDDDD',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderBottomColor: 'rgba(200,200,200,0.3)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tabItemGloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%' as any,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
});