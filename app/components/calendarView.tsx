import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Receipt } from '../types/receipt';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_SIZE = (SCREEN_WIDTH - 96) / 7;

interface CalendarViewProps {
  receipts: Receipt[];
  theme: any;
  isPro: boolean;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarView({ receipts, theme, isPro }: CalendarViewProps) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (!isPro && currentMonth === now.getMonth() && currentYear === now.getFullYear()) {
        return; // Free users can't go back
      }
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  const monthReceipts = receipts.filter(r => r.date.startsWith(monthKey));

  const spendByDay: Record<number, number> = {};
  monthReceipts.forEach(r => {
    const day = parseInt(r.date.split('-')[2]);
    spendByDay[day] = (spendByDay[day] || 0) + Number(r.total);
  });

  const selectedDayReceipts = selectedDay
    ? monthReceipts.filter(r => parseInt(r.date.split('-')[2]) === selectedDay)
    : [];

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  const isCurrentMonth = currentMonth === now.getMonth() && currentYear === now.getFullYear();

  return (
    <View style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthNav}>
        <TouchableOpacity
          onPress={() => navigateMonth('prev')}
          style={[
            styles.navButton,
            { backgroundColor: theme.cardInner },
            !isPro && isCurrentMonth && styles.navButtonDisabled,
          ]}
        >
          <Text style={[styles.navArrow, { color: theme.text }]}>←</Text>
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: theme.text }]}>
          {MONTHS[currentMonth]} {currentYear}
        </Text>

        <TouchableOpacity
          onPress={() => navigateMonth('next')}
          style={[styles.navButton, { backgroundColor: theme.cardInner }]}
        >
          <Text style={[styles.navArrow, { color: theme.text }]}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Free user banner */}
      {!isPro && (
        <Text style={[styles.proNote, { color: theme.subtext }]}>
          🔒 Pro unlocks full calendar history
        </Text>
      )}

      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {DAYS.map(d => (
          <Text key={d} style={[styles.dayHeader, { color: theme.subtext }]}>{d}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {cells.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.cell,
              (day !== null && !!spendByDay[day]) ? { backgroundColor: theme.button + '22' } : {},
              (day === now.getDate() && isCurrentMonth) ? styles.today : {},
            ]}
            onPress={() => {
              if (day && spendByDay[day]) {
                setSelectedDay(day);
                setShowDayModal(true);
              }
            }}
            disabled={!day || !spendByDay[day]}
          >
            {day && (
              <>
                <Text style={[
                  styles.dayNumber,
                  { color: theme.text },
                  day === now.getDate() && isCurrentMonth && { color: '#fff' },
                ]}>
                  {day}
                </Text>
                {spendByDay[day] && (
                  <Text style={[styles.dayAmount, { color: theme.button }]}>
                    ${Number(spendByDay[day]).toFixed(0)}
                  </Text>
                )}
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Day Detail Modal */}
      <Modal
        visible={showDayModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {MONTHS[currentMonth]} {selectedDay}, {currentYear}
              </Text>
              <TouchableOpacity onPress={() => setShowDayModal(false)}>
                <Text style={[styles.modalClose, { color: theme.subtext }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {selectedDayReceipts.map((r, i) => (
                <View key={i} style={[styles.receiptRow, { borderBottomColor: theme.border }]}>
                  <View>
                    <Text style={[styles.receiptMerchant, { color: theme.text }]}>{r.merchant}</Text>
                    <Text style={[styles.receiptCategory, { color: theme.subtext }]}>{r.category}</Text>
                  </View>
                  <Text style={[styles.receiptTotal, { color: theme.text }]}>
                    ${Number(r.total).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.dayTotal}>
                <Text style={[styles.dayTotalLabel, { color: theme.subtext }]}>Total</Text>
                <Text style={[styles.dayTotalAmount, { color: theme.button }]}>
                  ${selectedDay && spendByDay[selectedDay] ? Number(spendByDay[selectedDay]).toFixed(2) : '0.00'}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navArrow: {
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  monthTitle: {
    fontSize: 15,
    fontFamily: 'Poppins_700Bold',
  },
  proNote: {
    fontSize: 11,
    fontFamily: 'Poppins_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayHeader: {
    width: DAY_SIZE,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: DAY_SIZE,
    height: DAY_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 2,
  },
  today: {
    backgroundColor: '#53727B',
  },
  dayNumber: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
  },
  dayAmount: {
    fontSize: 9,
    fontFamily: 'Poppins_600SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  modalClose: {
    fontSize: 18,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  receiptMerchant: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  receiptCategory: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  receiptTotal: {
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  dayTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
  },
  dayTotalLabel: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  dayTotalAmount: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
});