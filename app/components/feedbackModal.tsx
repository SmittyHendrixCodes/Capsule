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
import { supabase } from '../services/supabaseClient';
import { Linking } from 'react-native';
import { useProStatus } from '../hooks/useProStatus';
import ProPromptModal from './proPromptModal';

type Tab = 'rate' | 'feedback' | 'ideas';

interface FeatureRequest {
  id: string;
  subject: string;
  description: string;
  upvotes: number;
  downvotes: number;
  created_at: string;
  userVote?: number;
}

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ visible, onClose }: FeedbackModalProps) {
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('feedback');

  // Feedback state
  const [rating, setRating] = useState(0);
  const [subject, setSubject] = useState('');
  const [comment, setComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Feature request state
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [reqSubject, setReqSubject] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // isPro
  const { isPro } = useProStatus();
  const [showProPrompt, setShowProPrompt] = useState(false);

  useEffect(() => {
    if (visible && activeTab === 'ideas') {
      loadRequests();
    }
  }, [visible, activeTab]);

  const loadRequests = async () => {
    setLoadingRequests(true);
    const { data, error } = await supabase
      .from('feature_requests')
      .select('*')
      .order('upvotes', { ascending: false });

    if (error) {
      console.error('loadRequests error:', error);
      setLoadingRequests(false);
      return;
    }

    // Get user votes if logged in
    if (user && data) {
      const { data: votes } = await supabase
        .from('feature_votes')
        .select('request_id, vote')
        .eq('user_id', user.id);

      const voteMap: Record<string, number> = {};
      votes?.forEach(v => { voteMap[v.request_id] = v.vote; });

      setRequests(data.map(r => ({
        ...r,
        userVote: voteMap[r.id] || 0,
      })));
    } else {
      setRequests(data || []);
    }
    setLoadingRequests(false);
  };

  const handleSendFeedback = async () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating.');
      return;
    }
    setSendingFeedback(true);
    try {
      await Linking.openURL(
        `mailto:feedback@capsuleapp.com?subject=${encodeURIComponent(subject || 'Capsule Feedback')}&body=${encodeURIComponent(
          `Rating: ${rating}/5\n\n${comment}`
        )}`
      );
      setRating(0);
      setSubject('');
      setComment('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Could not open email. Please try again.');
    }
    setSendingFeedback(false);
  };

  const handleSubmitRequest = async () => {
    if (!reqSubject.trim()) {
      Alert.alert('Required', 'Please enter a subject.');
      return;
    }
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to submit feature requests.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from('feature_requests')
      .insert({
        user_id: user.id,
        subject: reqSubject.trim(),
        description: reqDescription.trim(),
      });

    if (error) {
      Alert.alert('Error', 'Could not submit request. Please try again.');
    } else {
      setReqSubject('');
      setReqDescription('');
      setShowSubmitForm(false);
      await loadRequests();
      Alert.alert('✅ Submitted!', 'Your feature request has been submitted!');
    }
    setSubmitting(false);
  };

  const handleVote = async (requestId: string, vote: number) => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to vote.');
      return;
    }

    const existing = requests.find(r => r.id === requestId);
    const currentVote = existing?.userVote || 0;

    // If same vote — remove it
    if (currentVote === vote) {
      await supabase
        .from('feature_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('request_id', requestId);

      // Update counts
      await supabase
        .from('feature_requests')
        .update({
          upvotes: vote === 1 ? (existing?.upvotes || 1) - 1 : existing?.upvotes,
          downvotes: vote === -1 ? (existing?.downvotes || 1) - 1 : existing?.downvotes,
        })
        .eq('id', requestId);
    } else {
      // Upsert vote
      await supabase
        .from('feature_votes')
        .upsert({
          user_id: user.id,
          request_id: requestId,
          vote,
        });

      // Update counts
      await supabase
        .from('feature_requests')
        .update({
          upvotes: vote === 1
            ? (existing?.upvotes || 0) + 1
            : currentVote === 1
              ? (existing?.upvotes || 1) - 1
              : existing?.upvotes,
          downvotes: vote === -1
            ? (existing?.downvotes || 0) + 1
            : currentVote === -1
              ? (existing?.downvotes || 1) - 1
              : existing?.downvotes,
        })
        .eq('id', requestId);
    }

    await loadRequests();
  };

  const renderRateTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.rateEmoji}>⭐</Text>
      <Text style={[styles.rateTitle, { color: theme.text }]}>Enjoying Capsule?</Text>
      <Text style={[styles.rateSub, { color: theme.subtext }]}>
        Leave us a review on the App Store — it helps more than you know!
      </Text>
      <TouchableOpacity
        style={[styles.appStoreButton, { backgroundColor: theme.button }]}
        onPress={() => {
          Linking.openURL('https://apps.apple.com/app/capsule');
          onClose();
        }}
      >
        <Text style={[styles.appStoreButtonText, { color: theme.buttonText }]}>
          ⭐ Rate on App Store
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFeedbackTab = () => (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <Text style={[styles.sectionLabel, { color: theme.text }]}>How would you rate Capsule?</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Text style={[styles.star, rating >= star && styles.starActive]}>
              {rating >= star ? '⭐' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: theme.text }]}>Subject</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={subject}
        onChangeText={setSubject}
        placeholder="What's your feedback about?"
        placeholderTextColor={theme.subtext}
        maxLength={50}
      />

      <Text style={[styles.sectionLabel, { color: theme.text }]}>Comments</Text>
      <TextInput
        style={[styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
        value={comment}
        onChangeText={setComment}
        placeholder="Tell us what you think..."
        placeholderTextColor={theme.subtext}
        multiline
        numberOfLines={4}
        maxLength={500}
      />

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: theme.button }]}
        onPress={handleSendFeedback}
        disabled={sendingFeedback}
      >
        {sendingFeedback ? (
          <ActivityIndicator color={theme.buttonText} />
        ) : (
          <Text style={[styles.submitText, { color: theme.buttonText }]}>📧 Send Feedback</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderIdeasTab = () => (
    <View style={{ flex: 1 }}>
      {!showSubmitForm ? (
        <>
          <TouchableOpacity
            style={[styles.submitRequestButton, { backgroundColor: theme.button }]}
            onPress={() => {
              if (!isPro) {
                setShowProPrompt(true);
                return;
              }
              if (!user) {
                Alert.alert('Sign in required', 'Please sign in to submit.');
                return;
              }
              setShowSubmitForm(true);
            }}
          >
            <Text style={[styles.submitRequestText, { color: theme.buttonText }]}>
              💡 Submit a Feature Request
            </Text>
          </TouchableOpacity>

          {loadingRequests ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
          ) : requests.length === 0 ? (
            <View style={styles.emptyRequests}>
              <Text style={styles.emptyEmoji}>💡</Text>
              <Text style={[styles.emptyText, { color: theme.text }]}>No requests yet</Text>
              <Text style={[styles.emptySubtext, { color: theme.subtext }]}>
                Be the first to submit a feature idea!
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {requests.map((request) => (
                <View
                  key={request.id}
                  style={[styles.requestCard, { backgroundColor: theme.card }]}
                >
                  <Text style={[styles.requestSubject, { color: theme.text }]}>
                    {request.subject}
                  </Text>
                  {request.description ? (
                    <Text style={[styles.requestDescription, { color: theme.subtext }]}>
                      {request.description}
                    </Text>
                  ) : null}
                  <View style={styles.voteRow}>
                    <TouchableOpacity
                      style={[
                        styles.voteButton,
                        { backgroundColor: theme.cardInner },
                        request.userVote === 1 && { backgroundColor: '#10B981' },
                      ]}
                      onPress={() => {
                          if (!isPro) {
                            setShowProPrompt(true);
                            return;
                          }
                        handleVote(request.id, 1);
                      }}
                    >
                      <Text style={styles.voteButtonText}>👍 {request.upvotes}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.voteButton,
                        { backgroundColor: theme.cardInner },
                        request.userVote === -1 && { backgroundColor: '#EF4444' },
                      ]}
                      onPress={() => {
                          if (!isPro) {
                            setShowProPrompt(true);
                            return;
                          }
                        handleVote(request.id, 1);
                      }}
                    >
                      <Text style={styles.voteButtonText}>👎 {request.downvotes}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.requestDate, { color: theme.subtext }]}>
                      {new Date(request.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      ) : (
        <ScrollView contentContainerStyle={styles.tabContent}>
          <Text style={[styles.sectionLabel, { color: theme.text }]}>Subject</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={reqSubject}
            onChangeText={(t) => setReqSubject(t.slice(0, 50))}
            placeholder="Feature request title"
            placeholderTextColor={theme.subtext}
            maxLength={50}
          />
          <Text style={[styles.charCount, { color: theme.subtext }]}>{reqSubject.length}/50</Text>

          <Text style={[styles.sectionLabel, { color: theme.text }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={reqDescription}
            onChangeText={(t) => setReqDescription(t.slice(0, 100))}
            placeholder="Describe your feature idea..."
            placeholderTextColor={theme.subtext}
            multiline
            numberOfLines={3}
            maxLength={100}
          />
          <Text style={[styles.charCount, { color: theme.subtext }]}>{reqDescription.length}/100</Text>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.button }]}
            onPress={handleSubmitRequest}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={theme.buttonText} />
            ) : (
              <Text style={[styles.submitText, { color: theme.buttonText }]}>💡 Submit Request</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setShowSubmitForm(false);
              setReqSubject('');
              setReqDescription('');
            }}
          >
            <Text style={[styles.cancelText, { color: theme.subtext }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Feedback</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.subtext }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
          {(['rate', 'feedback', 'ideas'] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: theme.button, borderBottomWidth: 2 },
              ]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab ? theme.button : theme.subtext },
              ]}>
                {tab === 'rate' ? '⭐ Rate' : tab === 'feedback' ? '📝 Feedback' : '💡 Ideas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === 'rate' && renderRateTab()}
          {activeTab === 'feedback' && renderFeedbackTab()}
          {activeTab === 'ideas' && renderIdeasTab()}
        </View>
      </View>
      <ProPromptModal
        visible={showProPrompt}
        onClose={() => setShowProPrompt(false)}
        feature="Community Features"
        description="Submit feature requests and vote on ideas with a Pro membership. Help shape the future of Capsule!"
      />
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tabContent: {
    gap: 12,
    paddingBottom: 20,
  },
  rateEmoji: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 8,
  },
  rateTitle: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  rateSub: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  appStoreButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  appStoreButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    marginTop: 4,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  star: {
    fontSize: 36,
    opacity: 0.3,
  },
  starActive: {
    opacity: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  charCount: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'right',
    marginTop: -8,
  },
  submitRequestButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitRequestText: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  requestCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  requestSubject: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  requestDescription: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    lineHeight: 18,
  },
  voteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  voteButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  voteButtonText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  requestDate: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    marginLeft: 'auto',
  },
  emptyRequests: {
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
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
});