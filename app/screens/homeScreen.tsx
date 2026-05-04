import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useReceipts } from '../hooks/useReceipts';
import { Receipt } from '../types/receipt';
import SettingsSidebar from '../components/settingsSidebar';
import { useSettings } from '../context/settingsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../context/theme';
import OnboardingOverlay from '../components/onboardingOverlay';
import ProPromptModal from '../components/proPromptModal';
import { useProStatus } from '../hooks/useProStatus';
import CalendarView from '../components/calendarView';
import FeedbackModal from '../components/feedbackModal';

const SCREEN_WIDTH = Dimensions.get('window').width;

const MODULE_EMOJI: Record<string, string> = {
  work: '💼',
  tax: '🧾',
  personal: '🏠',
  general: '📁',
};

const CATEGORY_COLORS = [
  '#1C1C1E', '#7C3AED', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#3B82F6', '#1C1C1E',
];

export default function HomeScreen() {
  const { receipts, loadReceipts, loading } = useReceipts();
  const navigation = useNavigation<any>();

  const [greeting, setGreeting] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const { canViewAllCharts, isPro } = useProStatus();
  const [showProPrompt, setShowProPrompt] = useState(false);
  const [chartView, setChartView] = useState<'line' | 'calendar'>('line');
  const [showFeedback, setShowFeedback] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadReceipts();
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('Good morning');
      else if (hour > 12 && hour < 18) setGreeting('Good afternoon');
      else setGreeting('Good evening');
    }, [])
  );

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReceipts();
    setRefreshing(false);
  };

  // ── Stats ──────────────────────────────────────────────
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthReceipts = receipts.filter((r) => r.date.startsWith(thisMonth));
  const totalSpendThisMonth = monthReceipts.reduce((sum, r) => sum + Number(r.total), 0);
  const totalReceipts = receipts.length;

  const merchantCount: Record<string, number> = {};
  const receiptsForMerchant = monthReceipts.length > 0 ? monthReceipts : receipts;
  receiptsForMerchant.forEach((r) => {
    merchantCount[r.merchant] = (merchantCount[r.merchant] || 0) + Number(r.total);
  });
  const topMerchant = Object.entries(merchantCount).sort((a, b) => b[1] - a[1])[0];

  const cardCount: Record<string, number> = {};
  receipts.forEach((r) => {
    const card = r.cardLast4 || 'Cash / Not Available';
    cardCount[card] = (cardCount[card] || 0) + Number(r.total);
  });

  // ── Line Chart Data ────────────────────────────────────
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const monthlySpend = last6Months.map((month) =>
    receipts
      .filter((r) => r.date.startsWith(month))
      .reduce((sum, r) => sum + Number(r.total), 0)
  );

  // Line chart Math and Rounding
  const maxSpend = Math.max(...monthlySpend, 1);

  const getRoundedMax = (max: number) => {
    const bumped = max * 1.15;

    // Find clean step size based on scale
    let step: number;
    if (bumped <= 250) step = 50;
    else if (bumped <= 500) step = 100;
    else if (bumped <= 1000) step = 200;
    else if (bumped <= 2500) step = 500;
    else if (bumped <= 5000) step = 1000;
    else step = 2000;

    // Round up to nearest multiple of step
    const roundedMax = Math.ceil(bumped / step) * step;
    
    // Make sure it's divisible by 5 (segments) * step for clean ticks
    return Math.ceil(roundedMax / (step * 5)) * (step * 5);
  };
  const yAxisMax = getRoundedMax(maxSpend);

  const lineData = {
    labels: last6Months.map((m) => m.substring(5)),
    datasets: [
      { 
        data: monthlySpend.map((v) => (v === 0 ? 0.01 : v)),
        withDots: true,
      },
      {
        data: [yAxisMax], // ← forces y-axis max
        withDots: false,
        color: () => 'transparent', // invisible
        strokeWidth: 0,
      },
    ],
    legend: [],
  };

  // ── Pie Chart Data ─────────────────────────────────────
  const categoryTotals: Record<string, number> = {};
  receipts.forEach((r) => {
    categoryTotals[r.category] = (categoryTotals[r.category] || 0) + r.total;
  });

  const pieData = Object.entries(categoryTotals).map(([name, amount], i) => ({
    name,
    amount,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    legendFontColor: theme.text,
    legendFontSize: 12,
  }));

  // ── Recent Receipts ────────────────────────────────────
  const recentReceipts = [...receipts].slice(0, 5);

  // ── Quick Capture ──────────────────────────────────────
  const handleQuickCapture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your camera.');
      return;
    }
    navigation.navigate('Capture', { triggerCamera: true });
  };

  const chartConfig = {
    backgroundColor: theme.card,
    backgroundGradientFrom: theme.card,
    backgroundGradientTo: theme.card,
    decimalPlaces: 0,
    color: (opacity = 1) => darkMode ? `rgba(221,221,221,${opacity})` : `rgba(28,28,30,${opacity})`,
    labelColor: () => theme.subtext,
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: theme.text,
    },
    // This controls the y-axis scale
    count: 4,
    min: 0,
    max: yAxisMax,
  };

return (
  <View style={[styles.container, { backgroundColor: theme.background }]}>

    {/* Fixed Header */}
    <View style={[styles.header, { backgroundColor: theme.background }]}>
      <View>
        <Text style={[styles.greeting, { color: theme.subtext }]}>{greeting} 👋</Text>
        <Text style={[styles.appName, { color: theme.text }]}>Capsule</Text>
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={[styles.captureButton, { backgroundColor: theme.button }]} onPress={handleQuickCapture}>
          <Text style={[styles.captureButtonText, { color: theme.buttonText }]}>📷 Capture</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.gearButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)' }]}
          onPress={() => setShowSettings(true)}
        >
          <Text style={styles.gearIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Fixed Stats Bar */}
    <View style={[styles.statsBar, { backgroundColor: theme.card }]}>
      <View style={styles.statBarItem}>
        <Text style={[styles.statBarValue, { color: theme.text }]}>
          ${totalSpendThisMonth.toFixed(2)}
        </Text>
        <Text style={[styles.statBarLabel, { color: theme.subtext }]}>This Month</Text>
      </View>
      <View style={[styles.statBarDivider, { backgroundColor: theme.border }]} />
      <View style={styles.statBarItem}>
        <Text style={[styles.statBarValue, { color: theme.text }]}>{totalReceipts}</Text>
        <Text style={[styles.statBarLabel, { color: theme.subtext }]}>Total Logged</Text>
      </View>
      <View style={[styles.statBarDivider, { backgroundColor: theme.border }]} />
      <View style={styles.statBarItem}>
        <Text style={[styles.statBarValue, { color: theme.text }]} numberOfLines={1}>
          {topMerchant ? topMerchant[0] : '—'}
        </Text>
        <Text style={[styles.statBarLabel, { color: theme.subtext }]}>Top Merchant</Text>
      </View>
    </View>

    {/* Scrollable Content */}
    <ScrollView
      contentContainerStyle={styles.content}
      scrollEventThrottle={16}
      bounces={true}
      overScrollMode="always"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#DDDDDD"
          colors={['#DDDDDD']}
        />
      }
    >

      {/* Line Chart + Calendar Toggle */}
      {receipts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📈 Spending Trend</Text>
          <View style={[styles.chartCard, { backgroundColor: theme.card }]}>

            {/* Toggle Pill */}
            <View style={[styles.chartToggleContainer, { backgroundColor: theme.cardInner }]}>
              <TouchableOpacity
                style={[
                  styles.chartToggleButton,
                  chartView === 'line' && { backgroundColor: theme.button },
                ]}
                onPress={() => setChartView('line')}
              >
                <Text style={[
                  styles.chartToggleText,
                  { color: theme.subtext },
                  chartView === 'line' && { color: theme.buttonText },
                ]}>Line</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chartToggleButton,
                  chartView === 'calendar' && { backgroundColor: theme.button },
                ]}
                onPress={() => setChartView('calendar')}
              >
                <Text style={[
                  styles.chartToggleText,
                  { color: theme.subtext },
                  chartView === 'calendar' && { color: theme.buttonText },
                ]}>Cal</Text>
              </TouchableOpacity>
            </View>

            {/* Line Chart */}
            {chartView === 'line' && (
              <LineChart
                data={lineData}
                width={SCREEN_WIDTH - 64}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={false}
                withOuterLines={false}
                fromZero={true}
                yAxisLabel="$"
                yLabelsOffset={8}
                segments={5}
              />
            )}

            {/* Calendar View */}
            {chartView === 'calendar' && (
              <CalendarView
                receipts={receipts}
                theme={theme}
                isPro={isPro}
              />
            )}

          </View>
        </View>
      )}

      {/* Pie Chart */}
      {pieData.length > 0 && canViewAllCharts && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🥧 Spend by Category</Text>
          <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
            <PieChart
              data={pieData}
              width={SCREEN_WIDTH - 64}
              height={180}
              chartConfig={chartConfig}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute={false}
            />
          </View>
        </View>
      )}

      {/* Card Spend Breakdown */}
      {Object.keys(cardCount).length > 0 && canViewAllCharts && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>💳 Card Breakdown</Text>
          <View style={[styles.cardBreakdown, { backgroundColor: theme.card }]}>
            {Object.entries(cardCount).map(([card, amount]) => (
              <View key={card} style={[styles.cardBreakdownRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.cardBreakdownLabel, { color: theme.subtext }]}>
                  {card === 'Cash / Not Available' ? '💵 Cash / N/A' : `•••• ${card}`}
                </Text>
                <Text style={[styles.cardBreakdownValue, { color: theme.text }]}>${Number(amount).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Upgrade Prompt */}
      {!isPro && (
        <TouchableOpacity
          style={[styles.upgradePrompt, { backgroundColor: theme.card }]}
          onPress={() => setShowProPrompt(true)}
        >
          <Text style={[styles.upgradePromptText, { color: theme.text }]}>
            💰 Upgrade to Pro for spending insights & category breakdowns →
          </Text>
        </TouchableOpacity>
      )}

      {/* Recent Receipts */}
      {recentReceipts.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🕐 Recent Receipts</Text>
          {recentReceipts.map((receipt) => (
            <View key={receipt.id} style={[styles.recentCard, { backgroundColor: theme.card }]}>
              <View style={styles.recentLeft}>
                <Text style={[styles.recentModule, { color: theme.button }]}>
                  {MODULE_EMOJI[receipt.module]} {receipt.module.toUpperCase()}
                </Text>
                <Text style={[styles.recentMerchant, { color: theme.text }]}>{receipt.merchant}</Text>
                <Text style={[styles.recentDate, { color: theme.subtext }]}>{receipt.date}</Text>
              </View>
              <View style={styles.recentRight}>
                <Text style={[styles.recentTotal, { color: theme.text }]}>${receipt.total}</Text>
                <Text style={[styles.recentCategory, { color: theme.subtext, backgroundColor: theme.cardInner }]}>
                  {receipt.category}
                </Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.viewAllButton, { backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }]}
            onPress={() => navigation.navigate('Ledger')}
          >
            <Text style={[styles.viewAllText, { color: theme.accent }]}>View All in Ledger →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty State */}
      {receipts.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🚀</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Welcome to Capsule</Text>
          <Text style={[styles.emptySub, { color: theme.subtext }]}>
            Tap Capture above to log your first receipt and get started!
          </Text>
        </View>
      )}

    </ScrollView>

    {/* Overlays */}
      {showOnboarding && (
        <OnboardingOverlay
          currentScreen="Home"
          onNavigate={() => {}}
          onComplete={async () => {
            await AsyncStorage.setItem('onboarding_complete', 'true');
            setShowOnboarding(false);
          }}
        />
      )}

      <SettingsSidebar
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onReplayOnboarding={() => setShowOnboarding(true)}
        onViewProfile={() => navigation.navigate('Profile')}
        onOpenFeedback={() => setShowFeedback(true)}
      />

      <FeedbackModal
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
      />

      <ProPromptModal
        visible={showProPrompt}
        onClose={() => setShowProPrompt(false)}
        feature="Advanced Analytics"
        description="Unlock category breakdowns, card spending analysis and more with Pro."
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#53727B',
  },
  content: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  appName: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
  },
  captureButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  captureButtonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statCardPrimary: {
    backgroundColor: '#151516',
    flex: 1.2,
  },
  statsColumn: {
    flex: 1,
    gap: 12,
  },
  statCardSmall: {
    backgroundColor: '#DDDDDD',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statLabelLight: {
    fontSize: 11,
    color: '#DDDDDD',
    fontFamily: 'Poppins_600SemiBold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
  },
  statValueLarge: {
    fontSize: 26,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
    marginBottom: 4,
  },
  statValueSmall: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
  },
  statSubLight: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#DDDDDD',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 12,
  },
  cardBreakdown: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardBreakdownLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  cardBreakdownValue: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
  },
  recentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  recentLeft: {
    flex: 1,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentModule: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  recentMerchant: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  recentDate: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  recentTotal: {
    fontSize: 18,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  recentCategory: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#DDDDDD',
    borderRadius: 12,
    marginTop: 4,
  },
  viewAllText: {
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 56,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 22,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gearButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearIcon: {
    fontSize: 20,
  },
  upgradePrompt: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center' as const,
  },
  upgradePromptText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  chartToggleContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  chartToggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 17,
  },
  chartToggleText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
  statsBar: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  statBarItem: {
    flex: 1,
    alignItems: 'center',
  },
  statBarValue: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  statBarLabel: {
    fontSize: 10,
    fontFamily: 'Poppins_400Regular',
  },
  statBarDivider: {
    width: 1,
    height: 30,
  },
});