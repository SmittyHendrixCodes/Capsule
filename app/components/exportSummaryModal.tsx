import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { generateExportSummary } from '../services/claudeService';
import { Receipt } from '../types/receipt';

interface ExportSummaryModalProps {
  visible: boolean;
  receipts: Receipt[];
  onClose: () => void;
  onExport: (format: 'csv' | 'xml' | 'pdf', summary: string) => void;
}

export default function ExportSummaryModal({
  visible,
  receipts,
  onClose,
  onExport,
}: ExportSummaryModalProps) {
  const [smartSummaryEnabled, setSmartSummaryEnabled] = useState(true);
  const [summary, setSummary] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleToggle = async (value: boolean) => {
    setSmartSummaryEnabled(value);
    if (value) {
      setSummary('');
      setGenerated(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      const result = await generateExportSummary(receipts);
      setSummary(result);
      setGenerated(true);
    } catch (error) {
      Alert.alert('Error', 'Could not generate summary. Please try again.');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = (format: 'csv' | 'xml' | 'pdf') => {
    onExport(format, summary);
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
          <Text style={styles.title}>Export</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>

          {/* Summary toggle */}
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Text style={styles.toggleTitle}>🤖 Smart Summary</Text>
                <Text style={styles.toggleSubtitle}>
                  AI writes a professional summary for your export
                </Text>
              </View>
              <Switch
                value={smartSummaryEnabled}
                onValueChange={handleToggle}
                trackColor={{ false: '#E5E7EB', true: '#1C1C1E' }}
                thumbColor={smartSummaryEnabled ? '#DDDDDD' : '#fff'}
              />
            </View>
          </View>

          {/* Smart summary generation */}
          {smartSummaryEnabled && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Summary</Text>
              {!generated ? (
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={handleGenerateSummary}
                  disabled={generating}
                >
                  {generating ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.generateButtonText}>
                      ✨ Generate Summary
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={styles.summaryText}>{summary}</Text>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={handleGenerateSummary}
                    disabled={generating}
                  >
                    <Text style={styles.regenerateButtonText}>
                      🔄 Regenerate
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Manual summary */}
          {!smartSummaryEnabled && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Write Your Summary</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Write a summary for this export..."
                placeholderTextColor="#9CA3AF"
                value={summary}
                onChangeText={setSummary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Receipt count info */}
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              📊 Exporting <Text style={styles.infoBold}>{receipts.length} receipts</Text>
            </Text>
            <Text style={styles.infoText}>
              💰 Total: <Text style={styles.infoBold}>
                ${receipts.reduce((sum, r) => sum + r.total, 0).toFixed(2)}
              </Text>
            </Text>
          </View>

          {/* Export format buttons */}
          <Text style={styles.formatTitle}>Choose Format</Text>

          <TouchableOpacity
            style={styles.formatButton}
            onPress={() => handleExport('xml')}
          >
            <Text style={styles.formatEmoji}>📊</Text>
            <View>
              <Text style={styles.formatLabel}>Excel (.xml)</Text>
              <Text style={styles.formatSub}>Open in Excel or Numbers</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.formatButton}
            onPress={() => handleExport('csv')}
          >
            <Text style={styles.formatEmoji}>📋</Text>
            <View>
              <Text style={styles.formatLabel}>Excel (.csv)</Text>
              <Text style={styles.formatSub}>Universal spreadsheet format</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.formatButton}
            onPress={() => handleExport('pdf')}
          >
            <Text style={styles.formatEmoji}>📄</Text>
            <View>
              <Text style={styles.formatLabel}>PDF (.pdf)</Text>
              <Text style={styles.formatSub}>Formatted report, ready to share</Text>
            </View>
          </TouchableOpacity>

        </ScrollView>
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
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
  },
  content: {
    padding: 24,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleLeft: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    lineHeight: 22,
    marginBottom: 12,
  },
  regenerateButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  regenerateButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCard: {
    backgroundColor: '#DDDDDD',
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  infoBold: {
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
  },
  formatTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  formatButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  formatEmoji: {
    fontSize: 24,
  },
  formatLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  formatSub: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    marginTop: 2,
  },
});