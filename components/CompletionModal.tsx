// components/CompletionModal.tsx
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, TextInput, Image,
  KeyboardAvoidingView, Platform, StyleSheet
} from 'react-native';

interface CompletionModalProps {
  visible: boolean;
  onClose: () => void;
  estimatedTotal: number;
  actualTotal: number;
  actualPaid: string;
  editingActual: boolean;
  checkedCount: number;
  totalItems: number;
  receiptImage: string | null;
  theme: any;
  c: any;
  onStartEditingActual: () => void;
  onStopEditingActual: () => void;
  onUpdateActualPaid: (value: string) => void;
  onTakeReceiptPhoto: () => void;
  onSaveSession: () => void;
}

export const CompletionModal = ({
  visible,
  onClose,
  estimatedTotal,
  actualTotal,
  actualPaid,
  editingActual,
  checkedCount,
  totalItems,
  receiptImage,
  theme,
  c,
  onStartEditingActual,
  onStopEditingActual,
  onUpdateActualPaid,
  onTakeReceiptPhoto,
  onSaveSession,
}: CompletionModalProps) => {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={c.modalOverlay}
      >
        <View style={[c.modalCard, { maxHeight: '85%' }]}>
          <Text style={c.modalTitle}>🛍️ Trip Summary</Text>

          <View style={[styles.summaryBox, { backgroundColor: theme.chip, borderColor: theme.border }]}>
            <View style={c.spaceBetween}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Estimated</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>${(estimatedTotal || 0).toFixed(2)}</Text>
            </View>
            <View style={c.divider} />
            <View style={c.spaceBetween}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Actually paid</Text>
              {editingActual ? (
                <TextInput
                  style={[styles.paidInput, { color: theme.accent, borderColor: theme.accent }]}
                  value={actualPaid}
                  onChangeText={onUpdateActualPaid}
                  keyboardType="decimal-pad"
                  autoFocus
                  onBlur={onStopEditingActual}
                />
              ) : (
                <TouchableOpacity onPress={onStartEditingActual}>
                  <Text style={[styles.summaryValue, { color: theme.accent }]}>
                    ${parseFloat(actualPaid || '0').toFixed(2)} ✎ no tax
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={c.divider} />
            <View style={c.spaceBetween}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Difference</Text>
              <Text style={[styles.summaryValue, {
                color: parseFloat(actualPaid || '0') <= estimatedTotal ? theme.success : theme.danger,
              }]}>
                {parseFloat(actualPaid || '0') <= estimatedTotal ? '−' : '+'}
                ${Math.abs(estimatedTotal - parseFloat(actualPaid || '0')).toFixed(2)}
              </Text>
            </View>
            <Text style={[styles.itemSummary, { color: theme.textSubtle }]}>
              {checkedCount} of {totalItems} items purchased
            </Text>
          </View>

          <TouchableOpacity
            style={[c.ghostButton, { marginBottom: 10 }]}
            onPress={onTakeReceiptPhoto}
          >
            <Text style={[c.ghostButtonText, { color: theme.accent }]}>
              {receiptImage ? '📸 Retake Receipt' : '📷 Add Receipt Photo'}
            </Text>
          </TouchableOpacity>

          {receiptImage && (
            <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
          )}

          <View style={styles.completionBtns}>
            <TouchableOpacity
              style={[c.ghostButton, { flex: 1 }]}
              onPress={onClose}
            >
              <Text style={c.ghostButtonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[c.primaryButton, { flex: 1, backgroundColor: theme.success }]}
              onPress={onSaveSession}
            >
              <Text style={c.primaryButtonText}>Finish & Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  summaryBox: { borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1 },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  itemSummary: { fontSize: 12, textAlign: 'center', marginTop: 8 },
  paidInput: {
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    fontSize: 18, fontWeight: '700', minWidth: 90, textAlign: 'right',
  },
  receiptPreview: { width: '100%', height: 80, borderRadius: 10, marginBottom: 14 },
  completionBtns: { flexDirection: 'row', gap: 10 },
});