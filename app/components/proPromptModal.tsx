import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { useSettings } from '../context/settingsContext';
import { getTheme } from '../context/theme';

interface ProPromptModalProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  description: string;
}

export default function ProPromptModal({
  visible,
  onClose,
  feature,
  description,
}: ProPromptModalProps) {
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);

  const handleUpgrade = () => {
    Alert.alert('Upgrade to Pro', 'Pro subscriptions coming soon! Stay tuned.');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={styles.emoji}>💰</Text>
          <Text style={[styles.title, { color: theme.text }]}>
            {feature} is a Pro Feature
          </Text>
          <Text style={[styles.description, { color: theme.subtext }]}>
            {description}
          </Text>

          <View style={styles.perks}>
            {[
              'Unlimited captures & exports',
              'All chart views & insights',
              'Smart AI summaries',
              'Unlimited receipt history',
              'Cloud sync across devices',
            ].map((perk, i) => (
              <View key={i} style={styles.perkRow}>
                <Text style={styles.perkCheck}>✓</Text>
                <Text style={[styles.perkText, { color: theme.text }]}>{perk}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handleUpgrade}
          >
            <Text style={styles.upgradeText}>Upgrade to Pro →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Text style={[styles.closeText, { color: theme.subtext }]}>
              Maybe later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  perks: {
    width: '100%',
    gap: 8,
    marginVertical: 8,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  perkCheck: {
    fontSize: 14,
    color: '#10B981',
    fontFamily: 'Poppins_700Bold',
  },
  perkText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  upgradeButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  upgradeText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#DDDDDD',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
});