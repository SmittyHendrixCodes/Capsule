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
  CustomModule,
  DEFAULT_MODULES,
  getCustomModules,
  createCustomModule,
  updateCustomModule,
  deleteCustomModule,
} from '../services/moduleService';

interface ModuleManagerModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ModuleManagerModal({
  visible,
  onClose,
}: ModuleManagerModalProps) {
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const { user } = useAuth();

  const [customModules, setCustomModules] = useState<CustomModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingModule, setEditingModule] = useState<CustomModule | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadModules();
    }
  }, [visible]);

  const loadModules = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getCustomModules(user.id);
    setCustomModules(data);
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setEmoji('📁');
    setEditingModule(null);
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      Alert.alert('Required', 'Please enter a module name.');
      return;
    }
    if (customModules.length >= 12) {
      Alert.alert('Limit reached', 'You can only create up to 12 custom modules.');
      return;
    }
    setSaving(true);
    const newModule = await createCustomModule(user.id, name.trim(), emoji);
    if (newModule) {
      await loadModules();
      resetForm();
      setMode('list');
    } else {
      Alert.alert('Error', 'Could not create module. Please try again.');
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editingModule || !name.trim()) return;
    setSaving(true);
    const success = await updateCustomModule(editingModule.id, name.trim(), emoji);
    if (success) {
      await loadModules();
      resetForm();
      setMode('list');
    } else {
      Alert.alert('Error', 'Could not update module. Please try again.');
    }
    setSaving(false);
  };

  const handleDelete = (module: CustomModule) => {
    Alert.alert(
      'Delete Module',
      `Delete "${module.emoji} ${module.name}"? Receipts using this module won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomModule(module.id);
            await loadModules();
          },
        },
      ]
    );
  };

  const startEdit = (module: CustomModule) => {
    setEditingModule(module);
    setName(module.name);
    setEmoji(module.emoji);
    setMode('edit');
  };

  const renderForm = () => (
    <ScrollView contentContainerStyle={styles.formContent}>
      <Text style={[styles.formTitle, { color: theme.text }]}>
        {mode === 'create' ? 'Create Module' : 'Edit Module'}
      </Text>

      <Text style={[styles.label, { color: theme.subtext }]}>Emoji (optional)</Text>
      <TextInput
        style={[styles.emojiInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={emoji}
        onChangeText={setEmoji}
        placeholder="📁"
        placeholderTextColor={theme.subtext}
        maxLength={2}
      />

      <Text style={[styles.label, { color: theme.subtext }]}>Name *</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={name}
        onChangeText={(t) => setName(t.slice(0, 24))}
        placeholder="e.g. Side Hustle"
        placeholderTextColor={theme.subtext}
        maxLength={24}
      />
      <Text style={[styles.charCount, { color: theme.subtext }]}>{name.length}/24</Text>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.button }]}
        onPress={mode === 'create' ? handleCreate : handleEdit}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={theme.buttonText} />
        ) : (
          <Text style={[styles.submitText, { color: theme.buttonText }]}>
            {mode === 'create' ? 'Create Module' : 'Save Changes'}
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

      {/* Default modules — locked */}
      <Text style={[styles.sectionHeader, { color: theme.subtext }]}>DEFAULT MODULES</Text>
      {DEFAULT_MODULES.map((mod) => (
        <View key={mod.id} style={[styles.moduleCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.moduleEmoji]}>{mod.emoji}</Text>
          <Text style={[styles.moduleName, { color: theme.text }]}>{mod.name}</Text>
          <Text style={[styles.moduleLocked, { color: theme.subtext }]}>Built-in</Text>
        </View>
      ))}

      {/* Custom modules */}
      <View style={styles.customHeader}>
        <Text style={[styles.sectionHeader, { color: theme.subtext }]}>
          CUSTOM MODULES ({customModules.length}/12)
        </Text>
        {customModules.length < 12 && (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.button }]}
            onPress={() => {
              resetForm();
              setMode('create');
            }}
          >
            <Text style={[styles.addButtonText, { color: theme.buttonText }]}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
      ) : customModules.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📁</Text>
          <Text style={[styles.emptyText, { color: theme.text }]}>No custom modules yet</Text>
          <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
            Create up to 12 custom modules to organize your receipts your way.
          </Text>
        </View>
      ) : (
        customModules.map((mod) => (
          <View key={mod.id} style={[styles.moduleCard, { backgroundColor: theme.card }]}>
            <Text style={styles.moduleEmoji}>{mod.emoji}</Text>
            <Text style={[styles.moduleName, { color: theme.text }]}>{mod.name}</Text>
            <View style={styles.moduleActions}>
              <TouchableOpacity
                style={[styles.moduleActionButton, { backgroundColor: theme.cardInner }]}
                onPress={() => startEdit(mod)}
              >
                <Text style={[styles.moduleActionText, { color: theme.text }]}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moduleActionButton, { backgroundColor: '#FEE2E2' }]}
                onPress={() => handleDelete(mod)}
              >
                <Text style={styles.moduleActionText}>🗑</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
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
          <Text style={[styles.title, { color: theme.text }]}>Modules</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingTop: 12,
    paddingHorizontal: 52,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: '35%',
  },
  closeText: {
    fontSize: 18,
  },
  listContent: {
    padding: 20,
    gap: 10,
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
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 8,
  },
  customHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  moduleEmoji: {
    fontSize: 22,
  },
  moduleName: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  moduleLocked: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
  },
  moduleActions: {
    flexDirection: 'row',
    gap: 8,
  },
  moduleActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleActionText: {
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
  },
  emojiInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 22,
    textAlign: 'center',
    width: 60,
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
});