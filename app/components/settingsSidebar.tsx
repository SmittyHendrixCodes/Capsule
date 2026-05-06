import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Animated,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings } from '../context/settingsContext';
import { getTheme } from '../context/theme';
import { ModuleType } from '../types/receipt';
import { useAuth } from '../context/authContext';
import { supabase } from '../services/supabaseClient';
import FeedbackModal from './feedbackModal';
import { useProStatus } from '../hooks/useProStatus';
import ModuleManagerModal from './moduleManagerModal';
import ProPromptModal from './proPromptModal';
import { getAllModules, DEFAULT_MODULES } from '../services/moduleService';
import UpgradeModal from './upgradeModal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.82;

const MODULE_OPTIONS: { label: string; value: ModuleType; emoji: string }[] = [
  { label: 'Work Expense', value: 'work', emoji: '💼' },
  { label: 'Tax', value: 'tax', emoji: '🧾' },
  { label: 'Personal', value: 'personal', emoji: '🏠' },
  { label: 'General', value: 'general', emoji: '📁' },
];

const EXPORT_OPTIONS = [
  { label: 'PDF', value: 'pdf', emoji: '📄' },
  { label: 'CSV', value: 'csv', emoji: '📋' },
  { label: 'XML', value: 'xml', emoji: '📊' },
];

interface SettingsSidebarProps {
  visible: boolean;
  onClose: () => void;
  onReplayOnboarding: () => void;
  onViewProfile: () => void;
  onOpenFeedback: () => void;
}

export default function SettingsSidebar({
  visible,
  onClose,
  onReplayOnboarding,
  onViewProfile,
  onOpenFeedback,
}: SettingsSidebarProps) {
  const { signOut, user } = useAuth();
  const {
    darkMode, setDarkMode,
    defaultModule, setDefaultModule,
    defaultExportFormat, setDefaultExportFormat,
    notificationsEnabled, setNotificationsEnabled,
  } = useSettings();

  const slideAnim = React.useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const [profile, setProfile] = useState<any>(null);

  const [showFeedback, setShowFeedback] = useState(false);
  const { canUseDarkMode } = useProStatus();
  const [showProPrompt, setShowProPrompt] = useState(false);
  const { isPro } = useProStatus();
  const [showModuleManager, setShowModuleManager] = useState(false);
  const [allModules, setAllModules] = useState(DEFAULT_MODULES);
  const theme = getTheme(darkMode);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      getAllModules(user.id).then(setAllModules);
    }
  }, [user]);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const bg = darkMode ? '#1C1C1E' : '#53727B';
  const cardBg = darkMode ? '#2C2C2E' : 'rgba(255,255,255,0.12)';
  const textColor = '#fff';
  const subtextColor = 'rgba(255,255,255,0.6)';

  const handleReplayOnboarding = async () => {
    await AsyncStorage.removeItem('onboarding_complete');
    onClose();
    setTimeout(() => onReplayOnboarding(), 300);
  };

  const handleRateApp = () => {
    Alert.alert('Rate Capsule', 'This will open the App Store when published!');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Privacy Policy', 'Privacy policy will be available when published.');
  };

  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} onPress={onClose} />
          <Animated.View
            style={[
              styles.sidebar,
              { backgroundColor: bg, transform: [{ translateX: slideAnim }] },
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: textColor }]}>Settings</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Profile */}
              <TouchableOpacity 
                style={[styles.card, { backgroundColor: cardBg }]}
                onPress={() => {
                  onClose();
                  setTimeout(() => onViewProfile(), 500);
                }}
              >
              {/* Avatar with initials */}
              <View style={[styles.profileAvatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.profileAvatarText}>
                  {profile?.full_name
                    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                    : user?.email?.[0].toUpperCase() || '👤'}
                </Text>
              </View>

              <View style={styles.profileInfo}>
                {/* Name or email */}
                <Text style={[styles.profileName, { color: textColor }]} numberOfLines={1}>
                  {profile?.full_name || user?.email || 'Your Profile'}
                </Text>
                {/* Plan badge */}
                <Text style={[styles.profilePlan, { color: subtextColor }]}>
                  {profile?.plan === 'pro' ? '⭐ Pro Member' : '🆓 Free Plan'}
                </Text>
                {/* Stats row */}
                <View style={styles.profileStatsRow}>
                  {profile?.created_at && (
                    <Text style={[styles.profileStat, { color: subtextColor }]}>
                      📅 {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>

              {/* Default Export Format */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <Text style={[styles.cardTitle, { color: textColor }]}>📄 Default Export Format</Text>
                <View style={styles.optionRow}>
                  {EXPORT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.optionChip,
                        defaultExportFormat === opt.value && styles.optionChipActive,
                      ]}
                      onPress={() => setDefaultExportFormat(opt.value as 'csv' | 'xml' | 'pdf')}
                    >
                      <Text style={styles.optionChipEmoji}>{opt.emoji}</Text>
                      <Text style={[
                        styles.optionChipText,
                        defaultExportFormat === opt.value && styles.optionChipTextActive,
                      ]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Default Module */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: textColor }]}>📁 Default Module</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (!isPro) {
                        setShowProPrompt(true);
                        return;
                      }
                        onClose();
                        setTimeout(() => setShowModuleManager(true), 400);
                    }}
                  >
                    <Text style={[styles.actionText, { color: theme.button }]}>Manage →</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.moduleGrid}>
                  {allModules.map((mod) => (
                    <TouchableOpacity
                      key={mod.id}
                      style={[
                        styles.moduleChip,
                        defaultModule === mod.id && styles.moduleChipActive,
                      ]}
                      onPress={() => setDefaultModule(mod.id)}
                    >
                      <Text style={styles.moduleChipEmoji}>{mod.emoji}</Text>
                      <Text style={[
                        styles.moduleChipText,
                        defaultModule === mod.id && styles.moduleChipTextActive,
                      ]}>
                        {mod.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Toggles */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.toggleRow}>
                  <View>
                    <Text style={[styles.toggleLabel, { color: textColor }]}>🔔 Notifications</Text>
                    <Text style={[styles.toggleSub, { color: subtextColor }]}>Weekly digest reminders</Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#DDDDDD' }}
                    thumbColor={notificationsEnabled ? '#1C1C1E' : '#fff'}
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />

                <View style={styles.toggleRow}>
                  <View>
                    <Text style={[styles.toggleLabel, { color: textColor }]}>🌙 Dark Mode</Text>
                    <Text style={[styles.toggleSub, { color: subtextColor }]}>
                      {canUseDarkMode ? 'Switch app appearance' : '🔒 Pro feature'}
                    </Text>
                  </View>
                  <Switch
                    value={canUseDarkMode ? darkMode : false}
                    onValueChange={(val) => {
                      if (!canUseDarkMode) {
                        setShowProPrompt(true);
                        return;
                      }
                      setDarkMode(val);
                    }}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#DDDDDD' }}
                    thumbColor={darkMode ? '#1C1C1E' : '#fff'}
                    disabled={!canUseDarkMode}
                  />
                </View>
              </View>

              {/* Actions */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <TouchableOpacity style={styles.actionRow} onPress={handleReplayOnboarding}>
                  <Text style={[styles.actionText, { color: textColor }]}>🎓 Tutorial</Text>
                  <Text style={[styles.arrow, { color: subtextColor }]}>→</Text>
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
                  <TouchableOpacity
                    style={styles.actionRow}
                    onPress={() => {
                      onClose();
                      setTimeout(() => onOpenFeedback(), 300);
                    }}
                  >
                    <Text style={[styles.actionText, { color: textColor }]}>💬 Feedback</Text>
                    <Text style={[styles.arrow, {color: subtextColor }]}>→</Text>
                  </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />

                <TouchableOpacity style={styles.actionRow} onPress={handlePrivacyPolicy}>
                  <Text style={[styles.actionText, { color: textColor }]}>🔒 Privacy Policy</Text>
                  <Text style={[styles.arrow, { color: subtextColor }]}>→</Text>
                </TouchableOpacity>
              </View>

              {/* App Version */}
              <View style={[styles.card, { backgroundColor: cardBg }]}>
                <View style={styles.actionRow}>
                  <Text style={[styles.actionText, { color: textColor }]}>ℹ️ App Version</Text>
                  <Text style={[styles.versionText, { color: subtextColor }]}>1.0.0</Text>
                </View>
              </View>

              {/* Sign Out */}
              <TouchableOpacity
                style={[styles.card, { backgroundColor: 'rgba(255, 33, 33, 0.52)' }]}
                onPress={async () => {
                  await signOut();
                  onClose();
                }}
              >
                <View style={styles.actionRow}>
                  <Text style={[styles.actionText, { color: '#ffffff' }]}>🚪 Sign Out</Text>
                  <Text style={[styles.arrow, { color: '#EF4444' }]}>→</Text>
                </View>
              </TouchableOpacity>

              {/* Upgrade to Pro */}
              <TouchableOpacity
                style={styles.proButton}
                onPress={() => setShowUpgrade(true)}
              >
                <Text style={styles.proEmoji}>💰</Text>
                <View>
                  <Text style={styles.proTitle}>Upgrade to Pro</Text>
                  <Text style={styles.proSub}>Budget tracking, AI insights & more</Text>
                </View>
                <Text style={styles.proArrow}>→</Text>
              </TouchableOpacity>

            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
      <ModuleManagerModal
        visible={showModuleManager}
        onClose={() => {
          setShowModuleManager(false);
          // Reload modules so new ones appear immediately
          if (user) {
            getAllModules(user.id).then(setAllModules);
          }
        }}
      />
      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onUpgraded={() => {
          setShowUpgrade(false);
        }}
      />
      <ProPromptModal
        visible={showProPrompt}
        onClose={() => setShowProPrompt(false)}
        feature="Custom Modules"
        description="Create up to 12 custom modules to organize receipts your way. Pro feature."
      />
      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Poppins_600SemiBold',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 20,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  profileSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  arrow: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 4,
  },
  optionChipActive: {
    backgroundColor: '#DDDDDD',
    borderColor: '#DDDDDD',
  },
  optionChipEmoji: {
    fontSize: 16,
  },
  optionChipText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
  },
  optionChipTextActive: {
    color: '#1C1C1E',
  },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleChip: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  moduleChipActive: {
    backgroundColor: '#DDDDDD',
    borderColor: '#DDDDDD',
  },
  moduleChipEmoji: {
    fontSize: 16,
  },
  moduleChipText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.8)',
  },
  moduleChipTextActive: {
    color: '#1C1C1E',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
  },
  divider: {
    height: 1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  proButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proEmoji: {
    fontSize: 24,
  },
  proTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#DDDDDD',
    marginBottom: 2,
  },
  proSub: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(221,221,221,0.6)',
  },
  proArrow: {
    fontSize: 16,
    color: '#DDDDDD',
    fontFamily: 'Poppins_600SemiBold',
    marginLeft: 'auto' as any,
  },
  profilePlan: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginTop: 2,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  profileStat: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});