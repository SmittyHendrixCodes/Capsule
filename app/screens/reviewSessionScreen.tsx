import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { useReceipts } from '../hooks/useReceipts';
import { ReceiptData } from '../services/claudeService';
import { ModuleType } from '../types/receipt';

const MODULE_OPTIONS: { label: string; value: ModuleType; emoji: string }[] = [
  { label: 'Work Expense', value: 'work', emoji: '💼' },
  { label: 'Tax', value: 'tax', emoji: '🧾' },
  { label: 'Personal', value: 'personal', emoji: '🏠' },
  { label: 'General', value: 'general', emoji: '📁' },
];

export interface QueuedReceipt {
  receipt: ReceiptData;
  imageUri: string;
  module: ModuleType;
}

export default function ReviewSessionScreen({
  queue,
  onComplete,
  onClose,
  onDelete,
}: {
  queue: QueuedReceipt[];
  onComplete: () => void;
  onClose: () => void;
  onDelete: (index: number) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modules, setModules] = useState<ModuleType[]>(
    queue.map(() => 'general')
  );
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const { addReceipt } = useReceipts();

  const currentReceipt = queue[currentIndex];
  const isLast = currentIndex === queue.length - 1;

  const handleModuleChange = (module: ModuleType) => {
    const updated = [...modules];
    updated[currentIndex] = module;
    setModules(updated);
  };

  const handleNext = () => {
    if (!isLast) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        const itemsString = Array.isArray(item.receipt.items)
          ? (item.receipt.items as string[]).join(', ')
          : String(item.receipt.items);

        await addReceipt({
          merchant: item.receipt.merchant,
          date: item.receipt.date,
          total: item.receipt.total,
          category: item.receipt.category,
          items: itemsString,
          description: item.receipt.description,
          module: modules[i],
          imageUri: item.imageUri,
          cardLast4: item.receipt.cardLast4 || 'Cash / Not Available',
        });
        setSavedCount(i + 1);
      }
      Alert.alert(
        '✅ All Saved!',
        `${queue.length} receipts saved to your Capsule.`,
        [{ text: 'Done', onPress: onComplete }]
      );
    } catch (error) {
      Alert.alert('Error', 'Some receipts could not be saved.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Review Session</Text>
          <Text style={styles.counter}>
            {currentIndex + 1} of {queue.length}
          </Text>
        </View>

        {/* Progress dots */}
        <View style={styles.progressRow}>
          {queue.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i === currentIndex && styles.progressDotActive,
                i < currentIndex && styles.progressDotDone,
              ]}
            />
          ))}
        </View>

        {/* Card content */}
        <ScrollView contentContainerStyle={styles.cardContent}>
          {currentReceipt.imageUri && (
            <Image
              source={{ uri: currentReceipt.imageUri }}
              style={styles.receiptImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Receipt Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>🏪 Merchant</Text>
              <Text style={styles.value}>{currentReceipt.receipt.merchant}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>📅 Date</Text>
              <Text style={styles.value}>{currentReceipt.receipt.date}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>💰 Total</Text>
              <Text style={styles.value}>${currentReceipt.receipt.total}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>🏷 Category</Text>
              <Text style={styles.value}>{currentReceipt.receipt.category}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>💳 Card</Text>
              <Text style={styles.value}>
                {currentReceipt.receipt.cardLast4 || 'Cash / Not Available'}
              </Text>
            </View>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Save to Module</Text>
            <View style={styles.moduleRow}>
              {MODULE_OPTIONS.map((mod) => (
                <TouchableOpacity
                  key={mod.value}
                  style={[
                    styles.moduleButton,
                    modules[currentIndex] === mod.value && styles.moduleButtonActive,
                  ]}
                  onPress={() => handleModuleChange(mod.value)}
                >
                  <Text style={styles.moduleEmoji}>{mod.emoji}</Text>
                  <Text style={[
                    styles.moduleLabel,
                    modules[currentIndex] === mod.value && styles.moduleLabelActive,
                  ]}>
                    {mod.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteCardButton}
            onPress={() =>
              Alert.alert(
                'Remove Receipt',
                'Remove this receipt from the session?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                      onDelete(currentIndex);
                      if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
                    },
                  },
                ]
              )
            }
          >
            <Text style={styles.deleteCardButtonText}>🗑 Remove from Session</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Footer navigation */}
        <View style={styles.footer}>
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentIndex === 0 && styles.navButtonDisabled,
              ]}
              onPress={handlePrev}
              disabled={currentIndex === 0}
            >
              <Text style={styles.navButtonText}>← Prev</Text>
            </TouchableOpacity>

            {!isLast ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.saveAllButton}
                onPress={handleSaveAll}
                disabled={saving}
              >
                <Text style={styles.saveAllButtonText}>
                  {saving
                    ? `Saving ${savedCount}/${queue.length}...`
                    : `💾 Save All ${queue.length} Receipts`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
  },
  title: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
  },
  counter: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotActive: {
    backgroundColor: '#1C1C1E',
    width: 24,
    borderRadius: 4,
  },
  progressDotDone: {
    backgroundColor: '#fff',
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 16,
  },
  receiptImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  label: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  value: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  moduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moduleButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    width: '47%',
    backgroundColor: '#fff',
  },
  moduleButtonActive: {
    borderColor: '#1C1C1E',
    backgroundColor: '#DDDDDD',
  },
  moduleEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  moduleLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  moduleLabelActive: {
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    paddingTop: 16,
    backgroundColor: '#53727B',
  },
  navRow: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#fff',
  },
  saveAllButton: {
    flex: 2,
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  saveAllButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#DDDDDD',
  },
  deleteCardButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteCardButtonText: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
});