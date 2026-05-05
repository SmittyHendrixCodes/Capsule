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
} from 'react-native';
import { Receipt, ModuleType } from '../types/receipt';
import { useReceipts } from '../hooks/useReceipts';
import { useProStatus } from '../hooks/useProStatus';
import ProPromptModal from '../components/proPromptModal';
import { getAllModules, DEFAULT_MODULES } from '../services/moduleService';
import { useAuth } from '../context/authContext';
import { getTheme } from '../context/theme';
import { useSettings } from '../context/settingsContext';

const CATEGORIES = [
  'Food', 'Travel', 'Office', 'Shopping',
  'Utilities', 'Medical', 'Entertainment', 'Other'
];

interface EditReceiptScreenProps {
  receipt: Receipt;
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditReceiptScreen({
  receipt,
  visible,
  onClose,
  onSaved,
}: EditReceiptScreenProps) {
  const { editReceipt } = useReceipts();
  const [merchant, setMerchant] = useState(receipt.merchant);
  const [date, setDate] = useState(receipt.date);
  const [total, setTotal] = useState(String(receipt.total));
  const [category, setCategory] = useState(receipt.category);
    const [items, setItems] = useState(
    typeof receipt.items === 'string' ? receipt.items : (receipt.items as string[]).join(', ')
    );
  const [description, setDescription] = useState(receipt.description);
  const [cardLast4, setCardLast4] = useState(receipt.cardLast4 || '');
  const [saving, setSaving] = useState(false);
  const { isPro } = useProStatus();
  const [showProPrompt, setShowProPrompt] = useState(false);
  const { user } = useAuth();
  const [moduleOptions, setModuleOptions] = useState(DEFAULT_MODULES);
  const [selectedModule, setSelectedModule] = useState(receipt.module || 'general');
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);

    useEffect(() => {
      if (user) {
        getAllModules(user.id).then(setModuleOptions);
      }
    }, [user]);

  const handleSave = async () => {
    if (!merchant.trim()) {
      Alert.alert('Required', 'Merchant name is required.');
      return;
    }
    if (!date.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Invalid Date', 'Please use YYYY-MM-DD format.');
      return;
    }
    if (isNaN(parseFloat(total))) {
      Alert.alert('Invalid Total', 'Please enter a valid amount.');
      return;
    }

    setSaving(true);
    try {
      await editReceipt({
        ...receipt,
        merchant: merchant.trim(),
        date: date.trim(),
        total: parseFloat(total),
        category,
        items,
        description: description.trim(),
        cardLast4: cardLast4.trim() || 'Cash / Not Available',
        module: selectedModule,
      });
      onSaved();
    } catch (error) {
      Alert.alert('Error', 'Could not save changes. Please try again.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Receipt</Text>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              if (!isPro) {
                setShowProPrompt(true);
                return;
              }
              handleSave();
            }}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receipt Details</Text>

            <View style={styles.field}>
              <Text style={styles.label}>🏪 Merchant</Text>
              <TextInput
                style={styles.input}
                value={merchant}
                onChangeText={setMerchant}
                placeholder="Merchant name"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>📅 Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>💰 Total</Text>
              <TextInput
                style={styles.input}
                value={total}
                onChangeText={setTotal}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>💳 Card Last 4</Text>
              <TextInput
                style={styles.input}
                value={cardLast4}
                onChangeText={setCardLast4}
                placeholder="Last 4 digits or Cash"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏷 Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, category === cat && styles.chipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📁 Module</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.moduleScroll}
            >
              {moduleOptions.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={[
                    styles.moduleChip,
                    { 
                      backgroundColor: selectedModule === mod.id 
                        ? '#DDDDDD'
                        : 'rgba(255,255,255,0.15)',
                      borderColor: selectedModule === mod.id 
                        ? '#DDDDDD'
                        : 'rgba(255,255,255,0.3)',
                    },
                  ]}
                  onPress={() => setSelectedModule(mod.id)}
                >
                  <Text style={styles.moduleChipEmoji}>{mod.emoji}</Text>
                  <Text style={[
                    styles.moduleChipText,
                    { color: selectedModule === mod.id ? '#1C1C1E' : '#fff' }
                  ]}>
                    {mod.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief description..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🛍 Items</Text>
            <Text style={styles.hint}>Separate items with commas</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={items}
              onChangeText={setItems}
              placeholder="Item 1, Item 2, Item 3..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

        </ScrollView>
          <ProPromptModal
            visible={showProPrompt}
            onClose={() => setShowProPrompt(false)}
            feature="Edit Receipts"
            description="Editing receipts is a Pro feature. Upgrade to save changes to merchant names, dates, totals and more."
          />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#53727B',
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
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 24,
    top: '35%',
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  saveButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    top: '35%',
  },
  saveText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#DDDDDD',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    marginBottom: 4,
  },
field: {
  borderRadius: 16,
  padding: 0,
  marginBottom: 0,
  gap: 6,
},
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: 'rgba(255,255,255,0.7)',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textArea: {
    minHeight: 80,
  },
  hint: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.5)',
    marginTop: -8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipActive: {
    backgroundColor: '#DDDDDD',
    borderColor: '#DDDDDD',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.8)',
  },
  chipTextActive: {
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
  },
  moduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: '47%',
  },
  moduleButtonActive: {
    backgroundColor: '#DDDDDD',
    borderColor: '#DDDDDD',
  },
  moduleEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  moduleLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.7)',
  },
  moduleLabelActive: {
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
  },
  moduleScroll: {
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  moduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 6,
    marginRight: 8,
  },
  moduleChipEmoji: {
    fontSize: 16,
  },
  moduleChipText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
});