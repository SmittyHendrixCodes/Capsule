import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useSettings } from '../context/settingsContext';
import { getTheme } from '../context/theme';

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSend = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before sending.');
      return;
    }

    const stars = '⭐'.repeat(rating);
    const subject = `Capsule Feedback — ${stars} (${rating}/5)`;
    const body = `Rating: ${rating}/5 stars\n\nFeedback:\n${feedback || 'No additional comments.'}`;
    const email = 'feedback@capsuleapp.com';

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const canOpen = await Linking.canOpenURL(mailtoUrl);
    if (canOpen) {
      await Linking.openURL(mailtoUrl);
      setRating(0);
      setFeedback('');
      onClose();
    } else {
      Alert.alert(
        'No Email App Found',
        'Please email us directly at feedback@capsuleapp.com'
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Send Feedback</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.subtext }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Star Rating */}
          <Text style={[styles.label, { color: theme.text }]}>
            How would you rate Capsule?
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Text style={[
                  styles.star,
                  { opacity: star <= rating ? 1 : 0.3 }
                ]}>
                  ⭐
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {rating > 0 && (
            <Text style={[styles.ratingLabel, { color: theme.subtext }]}>
              {rating === 1 ? 'Poor' :
               rating === 2 ? 'Fair' :
               rating === 3 ? 'Good' :
               rating === 4 ? 'Great' : 'Excellent!'}
            </Text>
          )}

          {/* Feedback Text */}
          <Text style={[styles.label, { color: theme.text }]}>
            Additional feedback (optional)
          </Text>
          <TextInput
            style={[styles.input, {
              backgroundColor: theme.card,
              color: theme.text,
              borderColor: theme.border,
            }]}
            value={feedback}
            onChangeText={(text) => setFeedback(text.slice(0, 100))}
            placeholder="Tell us what you think..."
            placeholderTextColor={theme.subtext}
            multiline
            numberOfLines={4}
            maxLength={100}
            textAlignVertical="top"
          />
          <Text style={[styles.charCount, { color: theme.subtext }]}>
            {feedback.length}/100
          </Text>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.button }]}
            onPress={handleSend}
          >
            <Text style={[styles.sendText, { color: theme.buttonText }]}>
              📬 Send Feedback
            </Text>
          </TouchableOpacity>

          <Text style={[styles.note, { color: theme.subtext }]}>
            This will open your email app to send feedback directly to our team.
          </Text>
        </View>
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
    fontFamily: 'Poppins_600SemiBold',
  },
  content: {
    padding: 24,
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 36,
  },
  ratingLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    marginTop: -4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'right',
    marginTop: -8,
  },
  sendButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  sendText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  note: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});