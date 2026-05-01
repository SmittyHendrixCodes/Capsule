import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useReceipts } from '../hooks/useReceipts';
import { ModuleType } from '../types/receipt';
import { checkDuplicate } from '../services/database';
import { analyzeReceipt, checkReceiptQuality, ReceiptData } from '../services/claudeService';
import ReviewSessionScreen, { QueuedReceipt } from './reviewSessionScreen';
import { getTheme } from '../context/theme';
import { useSettings } from '../context/settingsContext';
import { scheduleSessionReminder, cancelSessionReminder } from '../services/notificationService';
import { useProStatus } from '../hooks/useProStatus';
import ProPromptModal from '../components/proPromptModal';

const SCREEN_HEIGHT = Dimensions.get('window').height;

const MODULE_OPTIONS: { label: string; value: ModuleType; emoji: string }[] = [
  { label: 'Work Expense', value: 'work', emoji: '💼' },
  { label: 'Tax', value: 'tax', emoji: '🧾' },
  { label: 'Personal', value: 'personal', emoji: '🏠' },
  { label: 'General', value: 'general', emoji: '📁' },
];

export default function CaptureScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [image, setImage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ModuleType>('general');
  const [saved, setSaved] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { addReceipt } = useReceipts();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const pulseOpacity = React.useRef(new Animated.Value(0.6)).current;
  const saveScale = React.useRef(new Animated.Value(1)).current;
  const [duplicate, setDuplicate] = useState<any>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [qualityIssue, setQualityIssue] = useState<string | null>(null);
  const [sessionQueue, setSessionQueue] = useState<QueuedReceipt[]>([]);
  const [showReviewSession, setShowReviewSession] = useState(false);
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const { canCapture, capturesRemaining, isPro } = useProStatus();
  const [showProPrompt, setShowProPrompt] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCameraActive(true);
      return () => setCameraActive(false);
    }, [])
  );

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.4,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (sessionQueue.length > 0) {
      scheduleSessionReminder(sessionQueue.length);
    } else {
      cancelSessionReminder();
    }
  }, [sessionQueue]);

  const handleImageCapture = async (base64: string, uri: string) => {
    setImage(uri);
    setReceipt(null);
    setSaved(false);
    setDuplicate(null);
    setShowDuplicateWarning(false);
    setQualityIssue(null);
    setLoading(true);
    setModalVisible(true);

    try {
        // Step 1 — quality check
        const quality = await checkReceiptQuality(base64);
        if (!quality.readable) {
          setQualityIssue(quality.reason);
          setLoading(false);
          return;
        }

        // Step 2 — full analysis
        const data = await analyzeReceipt(base64);
        setReceipt(data);

        // Step 3 — duplicate check
        const existing = await checkDuplicate(data.merchant, data.date, data.total);
        if (existing) {
          setDuplicate(existing);
          setShowDuplicateWarning(true);
        }

        // Add to session Queue
        setSessionQueue(prev => [...prev, { receipt: data, imageUri: uri, module: 'general' }]);

      } catch (error) {
        Alert.alert('Error', 'Could not analyze receipt. Please try again.');
        setModalVisible(false);
        console.error(error);
      } finally {
        setLoading(false);
    }
  };

  const takePicture = async () => {
    if (!canCapture) {
      setShowProPrompt(true);
      return;
    }
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });
      if (photo?.base64 && photo?.uri) {
        await handleImageCapture(photo.base64, photo.uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Could not take photo. Please try again.');
      console.error(error);
    }
  };

  const pickFromGallery = async () => {
    if (!canCapture) {
      setShowProPrompt(true);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].base64) {
      await handleImageCapture(result.assets[0].base64, result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!receipt) return;
    try {
      const itemsString = Array.isArray(receipt.items)
        ? (receipt.items as string[]).join(', ')
        : String(receipt.items ?? '');

      await addReceipt({
        merchant: receipt.merchant,
        date: receipt.date,
        total: receipt.total,
        category: receipt.category,
        items: itemsString,
        description: receipt.description,
        module: selectedModule,
        imageUri: image || undefined,
        cardLast4: receipt.cardLast4 || 'Cash / Not Available',
      });
      setSaved(true);
      Alert.alert('Saved!', 'Receipt has been saved to your Capsule.');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Could not save receipt. Please try again.');
    }
  };

  const handleSaveWithAnimation = () => {
    Animated.sequence([
      Animated.timing(saveScale, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(saveScale, {
        toValue: 1.06,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(saveScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => handleSave());
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setReceipt(null);
    setImage(null);
    setSaved(false);
    setSelectedModule('general');
    setDuplicate(null);
    setShowDuplicateWarning(false);
    setQualityIssue(null);
  };
  
  if (!permission) {
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }
  
  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.permissionText, { color: theme.text }]}>
          Camera access is needed to capture receipts.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSessionDelete = (index: number) => {
    setSessionQueue(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setShowReviewSession(false);
      }
      return updated;
    });
  };

  const handleClearSession = () => {
    setSessionQueue([]);
    setShowReviewSession(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Capture</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>Point at a receipt and capture</Text>
      </View>

      {/* Camera Preview */}
      <View style={styles.cameraContainer}>
        {cameraActive && (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
          />
        )}
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraCornerTL} />
          <View style={styles.cameraCornerTR} />
          <View style={styles.cameraCornerBL} />
          <View style={styles.cameraCornerBR} />
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonSection}>
        <View style={styles.captureButtonWrapper}>
          <Animated.View
            style={[
              styles.captureButtonPulse,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseOpacity,
              },
            ]}
          />
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.captureLabel, { color: theme.text }]}>Capture Receipt</Text>

        <TouchableOpacity style={[styles.galleryButton, { backgroundColor: theme.card }]} onPress={pickFromGallery}>
          <Text style={[styles.galleryButtonText, { color: theme.button }]}>🖼 Choose from Gallery</Text>
        </TouchableOpacity>

        {!isPro && (
          <Text style={[styles.captureLimit, { color: theme.subtext }]}>
            {capturesRemaining} free captures remaining this month
          </Text>
        )}

        {sessionQueue.length > 0 && !modalVisible && (
          <TouchableOpacity
            style={[styles.sessionIndicatorButton, { backgroundColor: theme.button }]}
            onPress={() => setShowReviewSession(true)}
          >
            <Text style={[styles.sessionIndicatorText, { color: theme.buttonText }]}>
              📋 Review Session ({sessionQueue.length} {sessionQueue.length === 1 ? 'receipt' : 'receipts'})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {loading ? 'Analyzing...' : 'Receipt Details'}
            </Text>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.text }]}>Claude is reading your receipt...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalContent}>
              {image && (
                <Image source={{ uri: image }} style={styles.previewImage} resizeMode="cover" />
              )}

              {qualityIssue && (
                <View style={styles.qualityIssueContainer}>
                  <Text style={styles.qualityIssueEmoji}>📷</Text>
                  <Text style={[styles.qualityIssueTitle, { color: theme.text }]}>Image Not Clear Enough</Text>
                  <Text style={[styles.qualityIssueText, { color: theme.subtext }]}>{qualityIssue}</Text>
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.retakeButtonText}>📷 Retake Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {showDuplicateWarning && duplicate && (
                <View style={styles.duplicateWarning}>
                  <View style={styles.duplicateWarningHeader}>
                    <Text style={styles.duplicateWarningEmoji}>⚠️</Text>
                    <Text style={styles.duplicateWarningTitle}>Possible Duplicate</Text>
                    <TouchableOpacity onPress={() => setShowDuplicateWarning(false)}>
                      <Text style={styles.duplicateWarningDismiss}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.duplicateWarningText}>
                    A receipt from <Text style={styles.duplicateWarningBold}>{duplicate.merchant}</Text> on <Text style={styles.duplicateWarningBold}>{duplicate.date}</Text> for <Text style={styles.duplicateWarningBold}>${duplicate.total}</Text> already exists in your Capsule.
                  </Text>
                  <Text style={styles.duplicateWarningSubtext}>
                    You can still save this receipt if it's different.
                  </Text>
                </View>
              )}

              {receipt && (
                <>
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
                    {(receipt.items as string[]).map((item: string, index: number) => (
                      <Text key={index} style={[styles.modalItem, { color: theme.text }]}>• {item}</Text>
                    ))}
                  </View>

                  <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Save to Module</Text>
                    <View style={styles.moduleRow}>
                      {MODULE_OPTIONS.map((mod) => (
                        <TouchableOpacity
                          key={mod.value}
                          style={[
                            styles.moduleButton,
                            { borderColor: 'rgba(255,255,255,0.2)' },
                            selectedModule === mod.value && { borderColor: theme.accent, backgroundColor: darkMode ? 'rgba(221,221,221,0.15)' : theme.cardInner },
                          ]}
                          onPress={() => setSelectedModule(mod.value)}
                        >
                          <Text style={styles.moduleEmoji}>{mod.emoji}</Text>
                          <Text style={[
                            styles.moduleLabel,
                            selectedModule === mod.value && styles.moduleLabelActive,
                          ]}>
                            {mod.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Animated.View style={{ transform: [{ scale: saveScale }] }}>
                    <TouchableOpacity
                      style={[styles.saveButton, saved && styles.saveButtonDone]}
                      onPress={handleSaveWithAnimation}
                      disabled={saved}
                    >
                      <Text style={styles.saveButtonText}>
                        {saved ? '✅ Saved to Capsule!' : '💾 Save Receipt'}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>

                  {receipt && (
                    <TouchableOpacity
                      style={[styles.captureAnotherButton, { backgroundColor: theme.cardInner }]}
                      onPress={handleCloseModal}
                    >
                      <Text style={[styles.captureAnotherText, { color: theme.button }]}>📷 Capture Another</Text>
                    </TouchableOpacity>
                  )}

                  {saved && sessionQueue.length > 1 && (
                    <TouchableOpacity
                      style={styles.reviewSessionButton}
                      onPress={() => {
                        setModalVisible(false);
                        setShowReviewSession(true);
                      }}
                    >
                      <Text style={styles.reviewSessionButtonText}>
                        📋 Review Session ({sessionQueue.length} receipts)
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
      {showReviewSession && (
        <ReviewSessionScreen
          queue={sessionQueue}
          onComplete={() => {
            handleClearSession();
          }}
          onClose={() => setShowReviewSession(false)}
          onDelete={handleSessionDelete}
        />
      )}
      <ProPromptModal
        visible={showProPrompt}
        onClose={() => setShowProPrompt(false)}
        feature="Unlimited Captures"
        description="You've reached your free capture limit for this month. Upgrade to Pro for unlimited receipt captures."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#53727B',
    paddingBottom: 100,
  },
  content: {
  paddingBottom: 120,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  cameraContainer: {
    marginHorizontal: 24,
    height: SCREEN_HEIGHT * 0.32,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  cameraCornerTL: {
    position: 'absolute',
    top: 12, left: 12,
    width: 24, height: 24,
    borderTopWidth: 3, borderLeftWidth: 3,
    borderColor: '#fff',
    borderTopLeftRadius: 6,
  },
  cameraCornerTR: {
    position: 'absolute',
    top: 12, right: 12,
    width: 24, height: 24,
    borderTopWidth: 3, borderRightWidth: 3,
    borderColor: '#fff',
    borderTopRightRadius: 6,
  },
  cameraCornerBL: {
    position: 'absolute',
    bottom: 12, left: 12,
    width: 24, height: 24,
    borderBottomWidth: 3, borderLeftWidth: 3,
    borderColor: '#fff',
    borderBottomLeftRadius: 6,
  },
  cameraCornerBR: {
    position: 'absolute',
    bottom: 12, right: 12,
    width: 24, height: 24,
    borderBottomWidth: 3, borderRightWidth: 3,
    borderColor: '#fff',
    borderBottomRightRadius: 6,
  },
  buttonSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    width: '100%',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    borderWidth: 4,
    borderColor: '#1C1C1E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1C1C1E',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
    captureButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    width: 80,
    height: 80,
  },
  captureButtonPulse: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#a70202',
    alignSelf: 'center',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ee3232',
  },
  captureLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    marginBottom: 24,
  },
  galleryButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  galleryButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#53727B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#53727B',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  modalContent: {
    padding: 24,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
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
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  modalValue: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1F2937',
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
  },
  moduleButtonActive: {
    borderColor: '#1C1C1E',
    backgroundColor: '#DDDDDD',
  },
  moduleEmoji: {
    fontSize: 20,
    fontFamily: 'Poppins_400Regular',
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
  saveButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDone: {
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  captureAnotherButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  captureAnotherText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  duplicateWarning: {
    backgroundColor: '#FFF3CD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  duplicateWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  duplicateWarningEmoji: {
    fontSize: 18,
  },
  duplicateWarningTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    color: '#92400E',
  },
  duplicateWarningDismiss: {
    fontSize: 14,
    color: '#92400E',
    fontFamily: 'Poppins_600SemiBold',
  },
  duplicateWarningText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 4,
  },
  duplicateWarningBold: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#78350F',
  },
  duplicateWarningSubtext: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#B45309',
  },
  qualityIssueContainer: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  padding: 40,
  gap: 16,
  },
  qualityIssueEmoji: {
    fontSize: 56,
  },
  qualityIssueTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  qualityIssueText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 22,
  },
  retakeButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 8,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  reviewSessionButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewSessionButtonText: {
    color: '#DDDDDD',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  sessionIndicatorButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 16,
    alignItems: 'center',
  },
  sessionIndicatorText: {
    color: '#DDDDDD',
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
  },
  captureLimit: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 8,
  },
});