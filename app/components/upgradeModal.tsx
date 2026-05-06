import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '../services/purchaseService';
import { useSettings } from '../context/settingsContext';
import { getTheme } from '../context/theme';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/authContext';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgraded: () => void;
}

export default function UpgradeModal({ visible, onClose, onUpgraded }: UpgradeModalProps) {
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const { user } = useAuth();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    setLoading(true);
    const offering = await getOfferings();
    if (offering?.availablePackages) {
      setPackages(offering.availablePackages);
      // Default select annual
      const annual = offering.availablePackages.find(p => 
        p.identifier === '$rc_annual'
      );
      setSelectedPackage(annual || offering.availablePackages[0]);
    }
    setLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;
    setPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        // Update Supabase
        if (user) {
          await supabase
            .from('profiles')
            .update({ plan: 'pro' })
            .eq('id', user.id);
        }
        Alert.alert('🎉 Welcome to Pro!', 'You now have full access to all Capsule Pro features!');
        onUpgraded();
        onClose();
      }
    } catch (error) {
      Alert.alert('Error', 'Purchase failed. Please try again.');
    }
    setPurchasing(false);
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const success = await restorePurchases();
    if (success) {
      if (user) {
        await supabase
          .from('profiles')
          .update({ plan: 'pro' })
          .eq('id', user.id);
      }
      Alert.alert('✅ Restored!', 'Your Pro subscription has been restored!');
      onUpgraded();
      onClose();
    } else {
      Alert.alert('No purchases found', 'No previous Pro subscription found to restore.');
    }
    setPurchasing(false);
  };

  const getPackagePrice = (pkg: PurchasesPackage) => {
    return pkg.product.priceString;
  };

  const getPackagePeriod = (pkg: PurchasesPackage) => {
    if (pkg.identifier === '$rc_monthly') return 'month';
    if (pkg.identifier === '$rc_annual') return 'year';
    return '';
  };

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
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeText, { color: theme.subtext }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>⭐</Text>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Capsule Pro</Text>
          <Text style={[styles.heroSub, { color: theme.subtext }]}>
            Unlock the full Capsule experience
          </Text>
        </View>

        {/* Features */}
        <View style={[styles.featuresCard, { backgroundColor: theme.card }]}>
          {[
            '📷 Unlimited captures & exports',
            '✏️ Edit receipts',
            '📁 Groups & custom modules',
            '📊 All charts & analytics',
            '🔍 Smart duplicate detection',
            '📅 Full receipt history',
            '🌙 Dark mode',
            '🤖 AI smart summaries',
          ].map((feature, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Packages */}
        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 20 }} />
        ) : (
          <View style={styles.packages}>
            {packages.map((pkg) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={[
                  styles.packageCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  selectedPackage?.identifier === pkg.identifier && {
                    borderColor: theme.button,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedPackage(pkg)}
              >
                {pkg.identifier === '$rc_annual' && (
                  <View style={[styles.saveBadge, { backgroundColor: theme.button }]}>
                    <Text style={[styles.saveBadgeText, { color: theme.buttonText }]}>
                      Save 44%
                    </Text>
                  </View>
                )}
                <Text style={[styles.packagePrice, { color: theme.text }]}>
                  {getPackagePrice(pkg)}
                </Text>
                <Text style={[styles.packagePeriod, { color: theme.subtext }]}>
                  per {getPackagePeriod(pkg)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.purchaseButton, { backgroundColor: theme.button }]}
          onPress={handlePurchase}
          disabled={purchasing || !selectedPackage}
        >
          {purchasing ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <Text style={[styles.purchaseText, { color: theme.buttonText }]}>
              {selectedPackage?.identifier === '$rc_annual'
                ? `Start Pro — ${getPackagePrice(selectedPackage)}/year`
                : `Start Pro — ${selectedPackage ? getPackagePrice(selectedPackage) : ''}/month`
              }
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} style={styles.restoreButton}>
          <Text style={[styles.restoreText, { color: theme.subtext }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        <Text style={[styles.legal, { color: theme.subtext }]}>
          Subscriptions auto-renew unless cancelled 24hrs before renewal.
          Cancel anytime in App Store settings.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeText: {
    fontSize: 20,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  heroEmoji: {
    fontSize: 48,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: 'Poppins_700Bold',
  },
  heroSub: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
  },
  featuresCard: {
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  packages: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  packageCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
    position: 'relative',
  },
  saveBadge: {
    position: 'absolute',
    top: -10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_700Bold',
  },
  packagePrice: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
  },
  packagePeriod: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  purchaseButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  purchaseText: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  restoreText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
  },
  legal: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});