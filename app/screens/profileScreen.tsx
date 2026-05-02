import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/authContext';
import { useSettings } from '../context/settingsContext';
import { getTheme } from '../context/theme';
import { supabase } from '../services/supabaseClient';
import { useReceipts } from '../hooks/useReceipts';
import { useNavigation } from '@react-navigation/native';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  plan: string;
  created_at: string;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const { receipts } = useReceipts();
  const navigation = useNavigation<any>();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile(data);
      setNewName(data.full_name || '');
    }
    setLoading(false);
  };

  const handleSaveName = async () => {
    if (!user || !newName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: newName.trim() })
      .eq('id', user.id);

    if (error) {
      Alert.alert('Error', 'Could not update name. Please try again.');
    } else {
      setProfile(prev => prev ? { ...prev, full_name: newName.trim() } : null);
      setEditing(false);
      Alert.alert('✅ Updated!', 'Your name has been updated.');
    }
    setSaving(false);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            navigation.goBack();
          },
        },
      ]
    );
  };

// Replace onClose with:
  const handleBack = () => navigation.goBack();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const lastReceipt = receipts.length > 0
    ? [...receipts].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
    : null;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0].toUpperCase() || '?';

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.text }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: theme.button }]}>
            <Text style={[styles.avatarText, { color: theme.buttonText }]}>
              {initials}
            </Text>
          </View>
          {editing ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={[styles.nameInput, {
                  color: theme.text,
                  borderColor: theme.accent,
                  backgroundColor: theme.card,
                }]}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                placeholder="Your name"
                placeholderTextColor={theme.subtext}
              />
              <TouchableOpacity
                style={[styles.saveNameButton, { backgroundColor: theme.button }]}
                onPress={handleSaveName}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={theme.buttonText} />
                ) : (
                  <Text style={[styles.saveNameText, { color: theme.buttonText }]}>Save</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.cardInner }]}
                onPress={() => {
                  setEditing(false);
                  setNewName(profile?.full_name || '');
                }}
              >
                <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={[styles.name, { color: theme.text }]}>
                {profile?.full_name || 'Add your name'} ✏️
              </Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.email, { color: theme.subtext }]}>
            {user?.email || profile?.email}
          </Text>
        </View>

        {/* Plan Badge */}
        <View style={[styles.planBadge, {
          backgroundColor: profile?.plan === 'pro' ? '#7C3AED' : theme.button
        }]}>
          <Text style={styles.planBadgeText}>
            {profile?.plan === 'pro' ? '⭐ Pro Member' : '🆓 Free Plan'}
          </Text>
        </View>

        {/* Info Cards */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.subtext }]}>📧 Email</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {user?.email || profile?.email}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.subtext }]}>📅 Member Since</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {profile?.created_at ? formatDate(profile.created_at) : '—'}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.subtext }]}>🧾 Total Receipts</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {receipts.length}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
            <Text style={[styles.infoLabel, { color: theme.subtext }]}>📷 Last Capture</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {lastReceipt ? lastReceipt.date : 'No receipts yet'}
            </Text>
          </View>
        </View>

        {/* Upgrade to Pro */}
        {profile?.plan !== 'pro' && (
          <TouchableOpacity style={styles.proButton}>
            <Text style={styles.proEmoji}>💰</Text>
            <View>
              <Text style={styles.proTitle}>Upgrade to Pro</Text>
              <Text style={styles.proSub}>Unlimited captures, exports & more</Text>
            </View>
            <Text style={styles.proArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Sign Out */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: theme.card }]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>🚪 Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
  },
  headerRight: {
    width: 60,
  },
  content: {
    padding: 24,
    gap: 16,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
  },
  editNameRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
  saveNameButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  saveNameText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  name: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  planBadge: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  planBadgeText: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  infoValue: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    maxWidth: '60%',
    textAlign: 'right',
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
  signOutButton: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#EF4444',
  },
});