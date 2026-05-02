import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSettings } from '../context/settingsContext';
import { getTheme } from '../context/theme';
import { useAuth } from '../context/authContext';
import {
  Group,
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
} from '../services/groupService';

interface GroupManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectGroup: (group: Group | null) => void;
  selectedGroupId?: string | null;
}

export default function GroupManagerModal({
  visible,
  onClose,
  onSelectGroup,
  selectedGroupId,
}: GroupManagerModalProps) {
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const { user } = useAuth();

  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    if (visible && user) {
      loadGroups();
    }
  }, [visible]);

  const loadGroups = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getGroups(user.id);
    setGroups(data);
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setPurpose('');
    setNotes('');
    setDateFrom('');
    setDateTo('');
    setEditingGroup(null);
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      Alert.alert('Required', 'Please enter a group name.');
      return;
    }
    setLoading(true);
    const newGroup = await createGroup(user.id, {
      name: name.trim(),
      purpose: purpose.trim(),
      notes: notes.trim(),
      date_from: dateFrom.trim(),
      date_to: dateTo.trim(),
    });
    if (newGroup) {
      await loadGroups();
      resetForm();
      setMode('list');
    } else {
      Alert.alert('Error', 'Could not create group. Please try again.');
    }
    setLoading(false);
  };

  const handleEdit = async () => {
    if (!editingGroup || !name.trim()) return;
    setLoading(true);
    const success = await updateGroup(editingGroup.id, {
      name: name.trim(),
      purpose: purpose.trim(),
      notes: notes.trim(),
      date_from: dateFrom.trim(),
      date_to: dateTo.trim(),
    });
    if (success) {
      await loadGroups();
      resetForm();
      setMode('list');
    } else {
      Alert.alert('Error', 'Could not update group. Please try again.');
    }
    setLoading(false);
  };

  const handleDelete = (group: Group) => {
    Alert.alert(
      'Delete Group',
      `Delete "${group.name}"? Receipts in this group won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteGroup(group.id);
            await loadGroups();
            setShowActions(null);
            if (selectedGroupId === group.id) {
              onSelectGroup(null);
            }
          },
        },
      ]
    );
  };

  const startEdit = (group: Group) => {
    setEditingGroup(group);
    setName(group.name);
    setPurpose(group.purpose || '');
    setNotes(group.notes || '');
    setDateFrom(group.date_from || '');
    setDateTo(group.date_to || '');
    setShowActions(null);
    setMode('edit');
  };

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.formContent}>
      <Text style={[styles.formTitle, { color: theme.text }]}>
        {mode === 'create' ? 'Create Group' : 'Edit Group'}
      </Text>

      <Text style={[styles.label, { color: theme.subtext }]}>Name *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={name}
        onChangeText={(t) => setName(t.slice(0, 24))}
        placeholder="e.g. NYC Business Trip"
        placeholderTextColor={theme.subtext}
        maxLength={24}
      />
      <Text style={[styles.charCount, { color: theme.subtext }]}>{name.length}/24</Text>

      <Text style={[styles.label, { color: theme.subtext }]}>Date Range</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.dateInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          value={dateFrom}
          onChangeText={setDateFrom}
          placeholder="From: YYYY-MM-DD"
          placeholderTextColor={theme.subtext}
        />
        <TextInput
          style={[styles.dateInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
          value={dateTo}
          onChangeText={setDateTo}
          placeholder="To: YYYY-MM-DD"
          placeholderTextColor={theme.subtext}
        />
      </View>

      <Text style={[styles.label, { color: theme.subtext }]}>Purpose</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={purpose}
        onChangeText={(t) => setPurpose(t.slice(0, 40))}
        placeholder="e.g. Client meetings and travel"
        placeholderTextColor={theme.subtext}
        maxLength={40}
      />
      <Text style={[styles.charCount, { color: theme.subtext }]}>{purpose.length}/40</Text>

      <Text style={[styles.label, { color: theme.subtext }]}>Notes</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={notes}
        onChangeText={(t) => setNotes(t.slice(0, 40))}
        placeholder="e.g. Reimburse by end of month"
        placeholderTextColor={theme.subtext}
        maxLength={40}
      />
      <Text style={[styles.charCount, { color: theme.subtext }]}>{notes.length}/40</Text>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.button }]}
        onPress={mode === 'create' ? handleCreate : handleEdit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={theme.buttonText} />
        ) : (
          <Text style={[styles.submitText, { color: theme.buttonText }]}>
            {mode === 'create' ? 'Create Group' : 'Save Changes'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => {
          resetForm();
          setMode('list');
        }}
      >
        <Text style={[styles.cancelText, { color: theme.subtext }]}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderList = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: theme.button }]}
        onPress={() => {
          resetForm();
          setMode('create');
        }}
      >
        <Text style={[styles.createButtonText, { color: theme.buttonText }]}>
          + Create New Group
        </Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : groups.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📁</Text>
          <Text style={[styles.emptyText, { color: theme.text }]}>No groups yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
            Create a group to organize your receipts
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.id}>
            <TouchableOpacity
              style={[
                styles.groupCard,
                { backgroundColor: theme.card },
                selectedGroupId === group.id && { borderColor: theme.button, borderWidth: 2 },
              ]}
              onPress={() => {
                onSelectGroup(group);
                onClose();
              }}
            >
              <View style={styles.groupInfo}>
                <Text style={[styles.groupName, { color: theme.text }]}>{group.name}</Text>
                {group.purpose ? (
                  <Text style={[styles.groupPurpose, { color: theme.subtext }]}>{group.purpose}</Text>
                ) : null}
                {group.date_from && group.date_to ? (
                  <Text style={[styles.groupDates, { color: theme.subtext }]}>
                    📅 {group.date_from} → {group.date_to}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.actionsButton}
                onPress={() => setShowActions(showActions === group.id ? null : group.id)}
              >
                <Text style={[styles.actionsText, { color: theme.subtext }]}>···</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {showActions === group.id && (
              <View style={[styles.actionsMenu, { backgroundColor: theme.card }]}>
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => {
                    onSelectGroup(group);
                    setShowActions(null);
                    onClose();
                  }}
                >
                  <Text style={[styles.actionItemText, { color: theme.text }]}>👁 Filter by this group</Text>
                </TouchableOpacity>
                <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => startEdit(group)}
                >
                  <Text style={[styles.actionItemText, { color: theme.text }]}>✏️ Edit</Text>
                </TouchableOpacity>
                <View style={[styles.actionDivider, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleDelete(group)}
                >
                  <Text style={[styles.actionItemText, { color: '#EF4444' }]}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}

      {selectedGroupId && (
        <TouchableOpacity
          style={[styles.clearFilter, { backgroundColor: theme.cardInner }]}
          onPress={() => {
            onSelectGroup(null);
            onClose();
          }}
        >
          <Text style={[styles.clearFilterText, { color: theme.text }]}>
            ✕ Clear Group Filter
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Group Manager</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.subtext }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {mode === 'list' ? renderList() : renderForm()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  formContent: {
    padding: 20,
    gap: 8,
  },
  formTitle: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 8,
  },
  createButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  groupCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupName: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  groupPurpose: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  groupDates: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
  },
  actionsButton: {
    padding: 8,
  },
  actionsText: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
  },
  actionsMenu: {
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  actionItem: {
    padding: 14,
  },
  actionItemText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  actionDivider: {
    height: 1,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'right',
    marginTop: -4,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  clearFilter: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFilterText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
});