import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface OnboardingStep {
  screen: 'Home' | 'Capture' | 'Ledger';
  title: string;
  description: string;
  spotlightY: number;
  spotlightX: number;
  spotlightWidth: number;
  spotlightHeight: number;
  tooltipPosition: 'top' | 'bottom';
  tooltipOffset?: number;
}

const STEPS: OnboardingStep[] = [
  {
    screen: 'Home',
    title: '📊 Your Dashboard',
    description: 'Track your spending at a glance. See this month\'s total, top merchants, and spending trends all in one place.',
    spotlightY: 150,
    spotlightX: 23.5,
    spotlightWidth: SCREEN_WIDTH - 47,
    spotlightHeight: 389,
    tooltipPosition: 'bottom',
  },
  {
    screen: 'Home',
    title: '📷 Quick Capture',
    description: 'Tap this button anytime to instantly capture a receipt. Claude AI will read and organize it for you automatically.',
    spotlightY: 69,
    spotlightX: SCREEN_WIDTH - 187,
    spotlightWidth: 111,
    spotlightHeight: 44,
    tooltipPosition: 'bottom',
  },
  {
    screen: 'Capture',
    title: '📷 Camera Preview',
    description: 'Point your camera at any receipt. The viewfinder helps you frame it perfectly before capturing.',
    spotlightY: 125,
    spotlightX: 26,
    spotlightWidth: SCREEN_WIDTH - 52,
    spotlightHeight: SCREEN_HEIGHT * 0.508,
    tooltipPosition: 'bottom',
  },
  {
    screen: 'Capture',
    title: '⭕ Capture',
    description: 'Tap the circle button to snap a photo, or choose from your gallery to upload an existing receipt.',
    spotlightY: SCREEN_HEIGHT * 0.665,
    spotlightX: SCREEN_WIDTH / 2 - 54,
    spotlightWidth: 108,
    spotlightHeight: 105,
    tooltipPosition: 'top',
    tooltipOffset: 225,
  },
  {
    screen: 'Ledger',
    title: '🧾 Your Ledger',
    description: 'Every captured receipt lives here. Tap any item to view details, search by merchant, or filter by module and date.',
    spotlightY: 175,
    spotlightX: 24,
    spotlightWidth: SCREEN_WIDTH - 48,
    spotlightHeight: 305,
    tooltipPosition: 'bottom',
  },
  {
    screen: 'Ledger',
    title: '⬆️ Export',
    description: 'Tap Export to generate professional expense reports. Export as PDF, CSV or XML — with an AI-written summary if you want.',
    spotlightY: 62,
    spotlightX: SCREEN_WIDTH - 110,
    spotlightWidth: 85,
    spotlightHeight: 36,
    tooltipPosition: 'bottom',
  },
];

interface OnboardingOverlayProps {
  currentScreen: 'Home' | 'Capture' | 'Ledger';
  onNavigate: (screen: 'Home' | 'Capture' | 'Ledger') => void;
  onComplete: () => void;
}

export default function OnboardingOverlay({
  currentScreen,
  onNavigate,
  onComplete,
}: OnboardingOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;
  const totalSteps = STEPS.length;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [stepIndex]);

  const handleNext = () => {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= STEPS.length) {
      handleComplete();
      return;
    }

    const nextStep = STEPS[nextIndex];
    if (nextStep.screen !== currentScreen) {
      onNavigate(nextStep.screen);
    }

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setStepIndex(nextIndex);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleComplete = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    setVisible(false);
    onComplete();
  };

  if (!visible || currentStep.screen !== currentScreen) return null;

  const {
    spotlightX,
    spotlightY,
    spotlightWidth,
    spotlightHeight,
    tooltipPosition,
    title,
    description,
  } = currentStep;

  const tooltipTop = tooltipPosition === 'bottom'
    ? spotlightY + spotlightHeight + (currentStep.tooltipOffset || 16)
    : spotlightY - (currentStep.tooltipOffset || 180);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>

        {/* Dark overlay — top */}
        <View style={[styles.darkArea, {
          top: 0,
          left: 0,
          right: 0,
          height: spotlightY,
        }]} />

        {/* Dark overlay — left */}
        <View style={[styles.darkArea, {
          top: spotlightY,
          left: 0,
          width: spotlightX,
          height: spotlightHeight,
        }]} />

        {/* Dark overlay — right */}
        <View style={[styles.darkArea, {
          top: spotlightY,
          left: spotlightX + spotlightWidth,
          right: 0,
          height: spotlightHeight,
        }]} />

        {/* Dark overlay — bottom */}
        <View style={[styles.darkArea, {
          top: spotlightY + spotlightHeight,
          left: 0,
          right: 0,
          bottom: 0,
        }]} />

        {/* Spotlight border */}
        <View style={[styles.spotlightBorder, {
          top: spotlightY - 6,
          left: spotlightX - 6,
          width: spotlightWidth + 12,
          height: spotlightHeight + 12,
        }]} />

        {/* Tooltip */}
        <View style={[styles.tooltip, { top: tooltipTop }]}>
          <Text style={styles.tooltipTitle}>{title}</Text>
          <Text style={styles.tooltipDescription}>{description}</Text>

          {/* Progress dots */}
          <View style={styles.progressRow}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i === stepIndex && styles.progressDotActive,
                  i < stepIndex && styles.progressDotDone,
                ]}
              />
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={handleComplete} style={styles.skipButton}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
              <Text style={styles.nextText}>
                {isLastStep ? "Let's go! 🚀" : 'Next →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  darkArea: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  spotlightBorder: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 6,
    borderColor: '#ff0000',
  },
  tooltip: {
    position: 'absolute',
    left: 24,
    right: 24,
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  tooltipTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#DDDDDD',
    marginBottom: 8,
  },
  tooltipDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressDotActive: {
    backgroundColor: '#DDDDDD',
    width: 20,
    borderRadius: 3,
  },
  progressDotDone: {
    backgroundColor: 'rgba(221,221,221,0.5)',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.5)',
  },
  nextButton: {
    backgroundColor: '#DDDDDD',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
  },
});