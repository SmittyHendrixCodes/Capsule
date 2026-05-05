import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  Image,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useReceipts } from '../hooks/useReceipts';
import { Receipt } from '../types/receipt';
import { exportToCSV, exportToXML, exportToPDF } from '../services/exportService';
import { useFocusEffect } from '@react-navigation/native';
import ExportSummaryModal from '../components/exportSummaryModal';
import EditReceiptScreen from '../screens/editReceiptScreen';
import { getTheme } from '../context/theme';
import { useSettings } from '../context/settingsContext';
import { useProStatus } from '../hooks/useProStatus';
import ProPromptModal from '../components/proPromptModal';
import GroupManagerModal from '../components/groupManagerModal';
import { Group, getGroups, assignReceiptToGroup } from '../services/groupService';
import { hapticMedium } from '../utils/haptics';
import ReceiptModal from '../components/receiptModal';
import { useAuth } from '../context/authContext';

const MODULE_EMOJI: Record<string, string> = {
  work: '💼',
  tax: '🧾',
  personal: '🏠',
  general: '📁',
};

const ReceiptCard = ({
  receipt,
  onDelete,
  onPress,
  onLongPress,
  index,
  theme,
  groups,
  onAssignGroup,
}: {
  receipt: Receipt;
  onDelete: (id: number | string) => void;
  onPress: (receipt: Receipt) => void;
  onLongPress: (receipt: Receipt) => void;
  index: number;
  theme: any,
  groups: Group[];
  onAssignGroup: (receiptId: number | string, groupId: string | null) => void;
}) => {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(20)).current;
  const translateX = React.useRef(new Animated.Value(0)).current;
  const deleteOpacity = React.useRef(new Animated.Value(1)).current;
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const handleDelete = () => {
    Alert.alert(
      'Delete Receipt',
      'Are you sure you want to delete this receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: -400,
                duration: 250,
                useNativeDriver: true,
              }),
              Animated.timing(deleteOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }),
            ]).start(() => {
              receipt.id && onDelete(receipt.id);
            });
          },
        },
      ]
    );
  };

  const animate = () => {
    opacity.setValue(0);
    translateY.setValue(20);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useFocusEffect(
    useCallback(() => {
    animate();
    }, [index])
  );

  return (
    <Animated.View style={{ 
      opacity: deleteOpacity, 
      transform: [{ translateY }, { translateX}],
      zIndex: showGroupPicker ? 999 : 1,
      elevation: showGroupPicker ? 999 : 1,
      }}>
      <TouchableOpacity 
        onPress={() => onPress(receipt)}
        onLongPress={() => onLongPress(receipt)}
        delayLongPress={400}
      >
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardLeft}>
              <Text style={styles.moduleTag}>
                {MODULE_EMOJI[receipt.module]} {receipt.module.toUpperCase()}
              </Text>
              <Text style={[styles.merchant, { color: theme.text }]}>{receipt.merchant}</Text>
              <Text style={[styles.date, { color: theme.subtext }]}>{receipt.date}</Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.total, { color: theme.text }]}>${receipt.total}</Text>
              <Text style={styles.category}>{receipt.category}</Text>
            </View>
          </View>
          <Text style={[styles.description, { color: theme.subtext }]}>{receipt.description}</Text>
          <View style={styles.cardFooter}>
          <View>  
            <TouchableOpacity
              style={styles.groupTagButton}
              onPress={() => setShowGroupPicker(!showGroupPicker)}
            >
              <Text style={styles.groupTagText}>
                {(receipt as any).group_id
                  ? `📁 ${groups.find(g => g.id === (receipt as any).group_id)?.name || 'Group'}`
                  : '📁 Add Group'}
              </Text>
            </TouchableOpacity>
            {showGroupPicker && (
              <View style={[styles.groupDropdown, { backgroundColor: theme.card }]}>
                <ScrollView
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 200 }}  // ← limits height, enables scroll
                  keyboardShouldPersistTaps="handled"
                >
                <TouchableOpacity
                  style={styles.groupDropdownItem}
                  onPress={() => {
                    receipt.id && onAssignGroup(receipt.id, null);
                    setShowGroupPicker(false);
                  }}
                >
                  <Text style={[styles.groupDropdownText, { color: theme.text }]}>
                    None
                  </Text>
                </TouchableOpacity>
                {groups.length === 0 ? (
                  <Text style={[styles.groupDropdownText, { color: theme.subtext, padding: 8 }]}>
                    No groups yet
                  </Text>
                ) : (
                  groups.map(g => (
                    <TouchableOpacity
                      key={g.id}
                      style={[
                        styles.groupDropdownItem,
                        (receipt as any).group_id === g.id && { backgroundColor: theme.cardInner }
                      ]}
                      onPress={() => {
                        receipt.id && onAssignGroup(receipt.id, g.id);
                        setShowGroupPicker(false);
                      }}
                    >
                      <Text style={[styles.groupDropdownText, { color: theme.text }]}>
                        📁 {g.name}
                      </Text>
                      {(receipt as any).group_id === g.id && (
                        <Text style={{ color: theme.button }}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
                </ScrollView>
              </View>
            )}
          </View>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={ handleDelete}
            >
              <Text style={styles.deleteText}>🗑 Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function LedgerScreen() {
  const insets = useSafeAreaInsets();
  const { darkMode } = useSettings();
  const theme = getTheme(darkMode);
  const { receipts, loading, loadReceipts, removeReceipt, editReceipt } = useReceipts();
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [exportReceipts, setExportReceipts] = useState<Receipt[]>([]);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProPrompt, setShowProPrompt] = useState(false);
  const { getFilteredReceipts, isPro, canEditReceipt } = useProStatus();
  const displayReceipts = getFilteredReceipts(receipts);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);

  const handleAssignGroup = async (receiptId: number | string, groupId: string | null) => {
    await assignReceiptToGroup(receiptId, groupId);
    await loadReceipts();
  };

  useFocusEffect(
    useCallback(() => {
      loadReceipts();
      if (user && isPro) {
        getGroups(user.id).then(setGroups);
      }
    }, [user, isPro])
  );

  const filteredReceipts = displayReceipts.filter((r) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      search === '' ||
      r.merchant.toLowerCase().includes(searchLower) ||
      r.description.toLowerCase().includes(searchLower) ||
      r.category.toLowerCase().includes(searchLower);
    const matchesModule =
      selectedModuleFilter === 'all' || r.module === selectedModuleFilter;
    const matchesCategory =
      selectedCategory === 'all' || r.category === selectedCategory;
    const matchesCard =
      selectedCard === 'all' ||
      (r.cardLast4 || 'Cash / Not Available') === selectedCard;
    const matchesMonth =
      selectedMonth === 'all' || r.date.startsWith(selectedMonth);
    const matchesGroup = !selectedGroup || (r as any).group_id === selectedGroup.id;
    return matchesSearch && matchesModule && matchesCategory && matchesCard && matchesMonth && matchesGroup;
  });

  const uniqueCategories = ['all', ...Array.from(new Set(receipts.map((r) => r.category)))];
  const uniqueCards = ['all', ...Array.from(new Set(receipts.map((r) => r.cardLast4 || 'Cash / Not Available')))];
  const uniqueMonths = ['all', ...Array.from(new Set(receipts.map((r) => r.date.substring(0, 7))))].sort().reverse();

  const activeFilterCount = [
    selectedModuleFilter !== 'all',
    selectedCategory !== 'all',
    selectedCard !== 'all',
    selectedMonth !== 'all',
  ].filter(Boolean).length;

  const handleDelete = useCallback(async (id: number | string) => {
    await hapticMedium();
    await removeReceipt(id);
  }, [removeReceipt]);

  const handlePress = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setModalVisible(true);
  };

  const handleClose = () => {
    setModalVisible(false);
    setSelectedReceipt(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]}>Ledger</Text>
        <TouchableOpacity
          style={[styles.exportButton, selectMode && styles.exportButtonActive]}
          onPress={() => {
            if (selectMode) {
              setSelectMode(false);
              setSelectedIds([]);
            } else {
              setSelectMode(true);
              setSelectedIds([]);
            }
          }}
        >
          <Text style={styles.exportButtonText}>
            {selectMode ? '✕ Cancel' : '⬆️ Export'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBar, { backgroundColor: theme.card }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search merchant, description..."
            placeholderTextColor={theme.subtext}
            value={search}
            onChangeText={setSearch}
          />
          {search !== '' && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={[styles.filterButtonText, activeFilterCount > 0 && styles.filterButtonTextActive]}>
            {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : 'Filter'}
          </Text>
        </TouchableOpacity>

          <TouchableOpacity
            style={[styles.groupButton, selectedGroup && styles.groupButtonActive]}
            onPress={() => {
              if (!isPro) {
                setShowProPrompt(true);
                return;
              }
              setShowGroupManager(true);
            }}
          >
            <Text style={[styles.groupButtonText, selectedGroup && styles.groupButtonTextActive]}>
              {selectedGroup ? '📁' : '📁 Groups'}
            </Text>
          </TouchableOpacity>
      </View>

      {activeFilterCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContainer}
        >
          {selectedModuleFilter !== 'all' && (
            <TouchableOpacity style={styles.chip} onPress={() => setSelectedModuleFilter('all')}>
              <Text style={styles.chipText}>{MODULE_EMOJI[selectedModuleFilter]} {selectedModuleFilter} ✕</Text>
            </TouchableOpacity>
          )}
          {selectedCategory !== 'all' && (
            <TouchableOpacity style={styles.chip} onPress={() => setSelectedCategory('all')}>
              <Text style={styles.chipText}>🏷 {selectedCategory} ✕</Text>
            </TouchableOpacity>
          )}
          {selectedCard !== 'all' && (
            <TouchableOpacity style={styles.chip} onPress={() => setSelectedCard('all')}>
              <Text style={styles.chipText}>💳 {selectedCard} ✕</Text>
            </TouchableOpacity>
          )}
          {selectedMonth !== 'all' && (
            <TouchableOpacity style={styles.chip} onPress={() => setSelectedMonth('all')}>
              <Text style={styles.chipText}>📅 {selectedMonth} ✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.chipClear}
            onPress={() => {
              setSelectedModuleFilter('all');
              setSelectedCategory('all');
              setSelectedCard('all');
              setSelectedMonth('all');
            }}
          >
            <Text style={styles.chipClearText}>Clear All</Text>
          </TouchableOpacity>
        </ScrollView>
      )}


      {selectMode && (
        <View style={styles.selectModeBar}>
          <TouchableOpacity
            style={styles.selectModeFilterButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={styles.selectModeFilterText}>🎛 Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={() => {
              if (selectedIds.length === filteredReceipts.length) {
                setSelectedIds([]);
              } else {
                setSelectedIds(filteredReceipts.map(r => r.id!));
              }
            }}
          >
            <Text style={styles.selectAllText}>
              {selectedIds.length === filteredReceipts.length
                ? '☑️ Deselect All'
                : '☐ Select All'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.selectedCountText}>
            {selectedIds.length} selected
          </Text>
        </View>
      )}
      <View style={[styles.summaryBar, { backgroundColor: theme.summaryBar }]}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{filteredReceipts.length}</Text>
          <Text style={styles.summaryLabel}>Receipts</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            ${filteredReceipts.reduce((sum, r) => sum + Number(r.total), 0).toFixed(2)}
          </Text>
          <Text style={styles.summaryLabel}>Total Spend</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {[...new Set(filteredReceipts.map((r) => r.module))].length}
          </Text>
          <Text style={styles.summaryLabel}>Modules</Text>
        </View>
      </View>

      {!isPro && (
        <TouchableOpacity
          style={[styles.historyBanner, { backgroundColor: theme.card }]}
          onPress={() => setShowProPrompt(true)}
        >
          <Text style={[styles.historyBannerText, { color: theme.subtext }]}>
            📅 Showing last 14 days · Upgrade for full history
          </Text>
        </TouchableOpacity>
      )}

      {filteredReceipts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🧾</Text>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {displayReceipts.length === 0 ? 'No receipts yet' : 'No results found'}
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.text }]}>
            {displayReceipts.length === 0
              ? 'Capture your first receipt to get started'
              : 'Try adjusting your search or filters'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredReceipts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => (
            <View style={styles.cardWrapper}>
              {selectMode && (
                <TouchableOpacity
                  style={styles.checkboxTouchable}
                  onPress={() => {
                    setSelectedIds(prev =>
                      prev.includes(item.id!)
                        ? prev.filter(id => id !== item.id)
                        : [...prev, item.id!]
                    );
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    selectedIds.includes(item.id!) && styles.checkboxActive,
                  ]}>
                    {selectedIds.includes(item.id!) && (
                      <Text style={styles.checkboxCheck}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              <View style={[
                styles.cardContainer,
                selectMode && styles.cardContainerWithCheckbox,
              ]}>
                <ReceiptCard
                  receipt={item}
                  onDelete={handleDelete}
                  onPress={selectMode ? () => {
                    setSelectedIds(prev =>
                      prev.includes(item.id!)
                        ? prev.filter(id => id !== item.id)
                        : [...prev, item.id!]
                    );
                  } : handlePress}
                  onLongPress={(receipt) => {
                    setEditingReceipt(receipt);
                    setShowEditModal(true);
                  }}
                  index={index}
                  theme={theme}
                  groups={groups}
                  onAssignGroup={handleAssignGroup}
                />
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadReceipts} />
          }
        />
      )}

      <ReceiptModal
        receipt={selectedReceipt}
        visible={modalVisible}
        onClose={handleClose}
        onEdit={(receipt) => {
          setEditingReceipt(receipt);
          setShowEditModal(true);
        }}
        theme={theme}
      />

      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={[styles.filterModalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.filterModalHeader, { backgroundColor: theme.card }]}>
            <Text style={[styles.filterModalTitle, { color: theme.text }]}>Filter</Text>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.filterModalClose}
              >
                <Text style={styles.filterModalCloseText}>✕</Text>
              </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.filterModalContent}>
            <Text style={[styles.filterSection, { color: theme.subtext }]}>Module</Text>
            <View style={styles.filterChipRow}>
              {['all', 'work', 'tax', 'personal', 'general'].map((mod) => (
                <TouchableOpacity
                  key={mod}
                  style={[styles.filterChip, selectedModuleFilter === mod && styles.filterChipActive]}
                  onPress={() => setSelectedModuleFilter(mod)}
                >
                  <Text style={[styles.filterChipText, selectedModuleFilter === mod && styles.filterChipTextActive]}>
                    {mod === 'all' ? 'All' : `${MODULE_EMOJI[mod]} ${mod.toUpperCase()}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterSection, { color: theme.subtext }]}>Category</Text>
            <View style={styles.filterChipRow}>
              {uniqueCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                    {cat === 'all' ? 'All' : cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterSection, { color: theme.subtext }]}>Month</Text>
            <View style={styles.filterChipRow}>
              {uniqueMonths.map((month) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.filterChip, selectedMonth === month && styles.filterChipActive]}
                  onPress={() => setSelectedMonth(month)}
                >
                  <Text style={[styles.filterChipText, selectedMonth === month && styles.filterChipTextActive]}>
                    {month === 'all' ? 'All' : month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.filterSection, { color: theme.subtext }]}>Card</Text>
            <View style={styles.filterChipRow}>
              {uniqueCards.map((card) => (
                <TouchableOpacity
                  key={card}
                  style={[styles.filterChip, selectedCard === card && styles.filterChipActive]}
                  onPress={() => setSelectedCard(card)}
                >
                  <Text style={[styles.filterChipText, selectedCard === card && styles.filterChipTextActive]}>
                    {card === 'all' ? 'All' : `💳 ${card}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.filterApplyButton}
            onPress={() => setShowFilterModal(false)}
          >
            <Text style={styles.filterApplyText}>
              Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {selectMode && (
        <View style={[styles.doneButtonContainer, {bottom: insets.bottom + 45 }]}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              if (selectedIds.length === 0) {
                Alert.alert(
                  'No Items Selected',
                  'Please select at least one receipt to include in your report.'
                );
                return;
              }
              const selected = filteredReceipts.filter(r =>
                selectedIds.includes(r.id!)
              );
              setExportReceipts(selected);
              setSelectMode(false);
              setShowExportModal(true);
            }}
          >
            <Text style={styles.doneButtonText}>
              Done — Export {selectedIds.length} {selectedIds.length === 1 ? 'Receipt' : 'Receipts'} →
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ExportSummaryModal
        visible={showExportModal}
        receipts={exportReceipts.length > 0 ? exportReceipts : filteredReceipts}
        onClose={() => {
          setShowExportModal(false);
          setExportReceipts([]);
          setSelectedIds([]);
        }}
        onExport={async (format, summary) => {
          setShowExportModal(false);
          const toExport = exportReceipts.length > 0 ? exportReceipts : filteredReceipts;
          try {
            if (format === 'csv') await exportToCSV(toExport, summary);
            if (format === 'xml') await exportToXML(toExport, summary);
            if (format === 'pdf') await exportToPDF(toExport, summary);
          } catch (error) {
            Alert.alert('Error', 'Could not export. Please try again.');
          }
        }}
      />
      {editingReceipt && (
        <EditReceiptScreen
          receipt={editingReceipt}
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingReceipt(null);
            setTimeout(() => loadReceipts(), 100);
          }}
          onSaved={() => {
            setShowEditModal(false);
            setEditingReceipt(null);
            loadReceipts();
            Alert.alert('✅ Updated!', 'Receipt has been updated.');
          }}
        />
      )}
      <GroupManagerModal
        visible={showGroupManager}
        onClose={() => setShowGroupManager(false)}
        onSelectGroup={(group) => setSelectedGroup(group)}
        selectedGroupId={selectedGroup?.id}
      />
      <ProPromptModal
        visible={showProPrompt}
        onClose={() => setShowProPrompt(false)}
        feature="Pro Feature"
        description="Upgrade to Pro to unlock edit receipts, full history, groups and more."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#53727B',
    paddingTop: 60,
  },
  // content: {
  // paddingBottom: 120,
  // },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
  },
  exportButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 12,
    gap: 10,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    fontFamily: 'Poppins_400Regular',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1F2937',
  },
  searchClear: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    paddingLeft: 8,
  },
  filterButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  filterButtonActive: {
    backgroundColor: '#1C1C1E',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  chipScroll: {
    marginBottom: 12,
    maxHeight: 36,
  },
  chipContainer: {
    paddingHorizontal: 24,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    backgroundColor: '#DDDDDD',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 13,
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
  },
  chipClear: {
    backgroundColor: '#FEE2E2',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipClearText: {
    fontSize: 13,
    color: '#EF4444',
    fontFamily: 'Poppins_600SemiBold',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#1C1C1E',
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#DDDDDD',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#1C1C1E',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardLeft: {
    flex: 1,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  moduleTag: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  merchant: {
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
  },
  total: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  description: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteText: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#EF4444',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyEmoji: {
    fontSize: 48,
    fontFamily: 'Poppins_400Regular',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  filterModalContainer: {
    flex: 1,
    backgroundColor: '#53727B',
  },
  filterModalHeader: {
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
  filterModalTitle: {
    fontSize: 24,
    fontFamily: 'Poppins_700Bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  filterModalClose: {
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
  filterModalCloseText: {
    fontSize: 16,
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
  },
  filterModalContent: {
    padding: 24,
  },
  filterSection: {
    fontSize: 13,
    fontFamily: 'Poppins_700Bold',
    color: '#1C1C1E',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 20,
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  filterChipActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  filterChipText: {
    fontSize: 13,
    color: '#1C1C1E',
    fontFamily: 'Poppins_600SemiBold',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  filterApplyButton: {
    backgroundColor: '#1C1C1E',
    margin: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  filterApplyText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  exportButtonActive: {
    backgroundColor: '#1C1C1E',
  },
  selectModeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    gap: 10,
  },
  selectModeFilterButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  selectModeFilterText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  selectAllButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  selectAllText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  selectedCountText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
    marginLeft: 'auto' as any,
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  cardContainer: {
    flex: 1,
  },
  cardContainerWithCheckbox: {
    marginLeft: 12,
  },
  checkboxTouchable: {
    padding: 4,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1C1C1E',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: '#1C1C1E',
    borderColor: '#1C1C1E',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Poppins_700Bold',
  },
  doneButtonContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
  },
  doneButton: {
    backgroundColor: '#1C1C1E',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  doneButtonText: {
    color: '#DDDDDD',
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
  },
  historyBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: -16,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  historyBannerText: {
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
  },
  groupButton: {
    backgroundColor: '#DDDDDD22',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  groupButtonActive: {
    backgroundColor: '#1C1C1E',
  },
  groupButtonText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: '#1C1C1E',
  },
  groupButtonTextActive: {
    color: '#DDDDDD',
  },
  groupTagButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  groupTagText: {
    fontSize: 12,
    fontFamily: 'Poppins_600SemiBold',
    color: '#53727B',
  },
  groupDropdown: {
    position: 'absolute',
    top: 36,
    left: 0,
    minWidth: 160,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
    overflow: 'hidden',
  },
  groupDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  groupDropdownText: {
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
  },
});