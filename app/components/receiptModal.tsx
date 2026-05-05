import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Receipt } from '../types/receipt';

const MODULE_EMOJI: Record<string, string> = {
  work: '💼',
  tax: '🧾',
  personal: '🏠',
  general: '📁',
};

interface ReceiptModalProps {
  receipt: Receipt | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (receipt: Receipt) => void;
  theme: any;
}

const ReceiptModal = ({
  receipt,
  visible,
  onClose,
  onEdit,
  theme,
}: ReceiptModalProps) => {
  if (!receipt) return null;

  const items = typeof receipt.items === 'string'
    ? receipt.items.split(',')
    : receipt.items as string[];

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save images.');
        return;
      }
      if (!receipt.imageUri) {
        Alert.alert('No image', 'No receipt image available to download.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(receipt.imageUri);
      Alert.alert('Saved!', 'Receipt image saved to your photo library.');
    } catch (error) {
      Alert.alert('Error', 'Could not save image. Please try again.');
    }
  };

  const handlePrint = async () => {
    try {
      const printItems = typeof receipt.items === 'string'
        ? receipt.items.split(',')
        : receipt.items as string[];

      let imageHtml = '';
      if (receipt.imageUri) {
        const base64 = await FileSystem.readAsStringAsync(receipt.imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const ext = receipt.imageUri.split('.').pop()?.toLowerCase() || 'jpeg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        imageHtml = `
          <div class="card">
            <h2>Receipt Image</h2>
            <img src="data:${mimeType};base64,${base64}" style="width:100%; border-radius:8px;" />
          </div>
        `;
      }

      const html = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #1F2937; }
              h1 { color: #1C1C1E; font-size: 24px; margin-bottom: 4px; }
              p.subtitle { color: #1C1C1E; font-size: 13px; margin-bottom: 24px; }
              .card { background: #53727B; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
              .card h2 { font-size: 15px; color: #1C1C1E; margin: 0 0 12px; }
              .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; }
              .label { color: #1C1C1E; font-size: 13px; }
              .value { font-weight: bold; font-size: 13px; color: #1F2937; }
              .description { font-size: 13px; color: #1C1C1E; line-height: 1.6; }
              .items { font-size: 13px; color: #374151; line-height: 1.8; }
              .total { font-size: 22px; font-weight: bold; color: #1C1C1E; }
              .footer { margin-top: 24px; font-size: 11px; color: #1C1C1E; text-align: center; }
            </style>
          </head>
          <body>
            <h1>💊 Capsule</h1>
            <p class="subtitle">Receipt — Exported ${new Date().toLocaleDateString()}</p>
            <div class="card">
              <h2>Receipt Details</h2>
              <div class="row">
                <span class="label">🏪 Merchant</span>
                <span class="value">${receipt.merchant}</span>
              </div>
              <div class="row">
                <span class="label">📅 Date</span>
                <span class="value">${receipt.date}</span>
              </div>
              <div class="row">
                <span class="label">🏷 Category</span>
                <span class="value">${receipt.category}</span>
              </div>
              <div class="row">
                <span class="label">${MODULE_EMOJI[receipt.module]} Module</span>
                <span class="value">${receipt.module.toUpperCase()}</span>
              </div>
              <div class="row">
                <span class="label">💳 Card</span>
                <span class="value">${receipt.cardLast4 || 'Cash / Not Available'}</span>
              </div>
              <div class="row">
                <span class="label">💰 Total</span>
                <span class="total">$${Number(receipt.total).toFixed(2)}</span>
              </div>
            </div>
            <div class="card">
              <h2>Description</h2>
              <p class="description">${receipt.description}</p>
            </div>
            <div class="card">
              <h2>Items</h2>
              <p class="items">${printItems.map((i: string) => `• ${i.trim()}`).join('<br/>')}</p>
            </div>
            ${imageHtml}
            <p class="footer">Generated by Capsule • ${new Date().toLocaleString()}</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Print Receipt as PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not generate PDF. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: theme.card }]}>
          <View style={styles.modalTitleContainer}>
            <Text style={[styles.modalTitle, {color: theme.text }]}>{receipt.merchant}</Text>
            </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Receipt Details</Text>
            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.subtext }]}>🏪 Merchant</Text>
              <Text style={[styles.modalValue, { color: theme.text }]}>{receipt.merchant}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.subtext }]}>📅 Date</Text>
              <Text style={[styles.modalValue, { color: theme.text }]}>{receipt.date}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.subtext }]}>💰 Total</Text>
              <Text style={[styles.modalValue, { color: theme.text }]}>${receipt.total}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.subtext }]}>🏷 Category</Text>
              <Text style={[styles.modalValue, { color: theme.text }]}>{receipt.category}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.subtext }]}>{MODULE_EMOJI[receipt.module]} Module</Text>
              <Text style={[styles.modalValue, { color: theme.text }]}>{receipt.module.toUpperCase()}</Text>
            </View>
            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.subtext }]}>💳 Card</Text>
              <Text style={[styles.modalValue, { color: theme.text }]}>{receipt.cardLast4 || 'Cash / Not Available'}</Text>
            </View>
          </View>

          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Description</Text>
            <Text style={[styles.modalDescription, { color: theme.subtext }]}>{receipt.description}</Text>
          </View>

          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Items</Text>
            {items.map((item: string, index: number) => (
              <Text key={index} style={[styles.modalItem, { color: theme.text }]}>• {item.trim()}</Text>
            ))}
          </View>

          {receipt.imageUri ? (
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Receipt Image</Text>
              <Image
                source={{ uri: receipt.imageUri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onEdit(receipt);
                }}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>✏️ Edit Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.downloadButton} onPress={handleDownload}>
                <Text style={styles.downloadButtonText}>⬇️ Save Image to Photos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Text style={styles.printButtonText}>🖨️ Print Report as PDF</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Receipt Image</Text>
              <Text style={[styles.noImageText, { color: theme.subtext }]}>No image available for this receipt</Text>
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onEdit(receipt);
                }}
                style={styles.editButton}
              >
                <Text style={styles.editButtonText}>✏️ Edit Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
                <Text style={styles.printButtonText}>🖨️ Print as PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#53727B',
  },
  modalHeader: {
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
  modalTitleContainer: {
    flex: 1,
    paddingRight: 8,
    alignItems: 'center',
  },
  modalTitle: {
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
  modalContent: {
    padding: 24,
  },
  modalImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    marginBottom: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#53727B',
    flexWrap: 'wrap',
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    flexShrink: 0,
  },
  modalValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
    maxWidth: '55%',
    textAlign: 'right',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    lineHeight: 22,
  },
  modalItem: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#374151',
    paddingVertical: 4,
  },
  editButton: {
    backgroundColor: '#DDDDDD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  editButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  downloadButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  printButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  printButtonText: {
    color: '#1C1C1E',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  noImageText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default ReceiptModal;