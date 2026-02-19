import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { AppTheme, makeCommonStyles, makeShadow, THEMES } from '../theme/theme';

export default function ThemeScreen() {
  const { theme, themeId, setThemeId } = useTheme();
  const c = makeCommonStyles(theme);

  return (
    <View style={[c.screen]}>
      <StatusBar barStyle={theme.statusBarStyle} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[c.sectionTitle, { marginHorizontal: 20, marginTop: 20 }]}>
          Choose a theme
        </Text>

        <View style={styles.grid}>
          {THEMES.map(t => (
            <ThemeCard
              key={t.id}
              t={t}
              selected={t.id === themeId}
              onSelect={() => setThemeId(t.id)}
            />
          ))}
        </View>

        {/* Preview panel */}
        <View style={[styles.previewContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.previewLabel, { color: theme.textSubtle }]}>PREVIEW</Text>

          {/* Simulated list item */}
          <View style={[styles.previewItem, { backgroundColor: theme.card, borderColor: theme.border, ...makeShadow(theme, 'sm') }]}>
            <View style={[styles.previewThumb, { backgroundColor: theme.chip }]}>
              <Text style={{ fontSize: 20 }}>🛒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewItemName, { color: theme.text }]}>Organic Milk</Text>
              <Text style={[styles.previewItemSub, { color: theme.textMuted }]}>Organic Valley · Last: $4.99</Text>
            </View>
            <View style={[styles.previewCheck, { backgroundColor: theme.success }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✓</Text>
            </View>
          </View>

          {/* Simulated chips */}
          <View style={styles.previewChips}>
            {['All', 'Dairy', 'Produce'].map((label, i) => (
              <View
                key={label}
                style={[
                  styles.previewChip,
                  i === 0
                    ? { backgroundColor: theme.chipSelected }
                    : { backgroundColor: theme.chip },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: i === 0 ? theme.chipSelectedText : theme.chipText }}>
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {/* Simulated button */}
          <View style={[c.primaryButton, { marginTop: 12 }]}>
            <Text style={c.primaryButtonText}>Start Shopping</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ThemeCard({ t, selected, onSelect }: { t: AppTheme; selected: boolean; onSelect: () => void }) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: t.card, borderColor: selected ? t.accent : t.border },
        selected && { ...makeShadow(t, 'md') },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {/* Swatch strip */}
      <View style={styles.swatchRow}>
        {[t.bg, t.accent, t.success, t.danger].map((color, i) => (
          <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>

      {/* Theme emoji + name */}
      <View style={styles.cardBody}>
        <Text style={styles.emoji}>{t.emoji}</Text>
        <Text style={[styles.themeName, { color: t.text }]}>{t.name}</Text>
        <Text style={[styles.themeType, { color: t.textMuted }]}>{t.dark ? 'Dark' : 'Light'}</Text>
      </View>

      {/* Selected check */}
      {selected && (
        <View style={[styles.selectedBadge, { backgroundColor: t.accent }]}>
          <Text style={{ color: t.accentText, fontSize: 11, fontWeight: '700' }}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 12,
    marginBottom: 28,
    marginTop: 4,
  },
  card: {
    width: '46%',
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
  },
  swatchRow: {
    flexDirection: 'row',
    height: 10,
  },
  swatch: {
    flex: 1,
  },
  cardBody: {
    padding: 14,
    paddingTop: 12,
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  themeName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  themeType: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectedBadge: {
    position: 'absolute',
    top: 18,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 14,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  previewThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  previewItemSub: {
    fontSize: 12,
  },
  previewCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewChips: {
    flexDirection: 'row',
    gap: 8,
  },
  previewChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
});
