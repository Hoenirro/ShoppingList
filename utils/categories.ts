// utils/categories.ts

export interface Category {
  label: string;   // full display string e.g. "🥛 Dairy"
  emoji: string;
}

export const BUILT_IN_CATEGORIES: Category[] = [
  { label: '🥛 Dairy',          emoji: '🥛' },
  { label: '🍞 Bakery',         emoji: '🍞' },
  { label: '🥩 Meat',           emoji: '🥩' },
  { label: '🥦 Produce',        emoji: '🥦' },
  { label: '🧊 Frozen',         emoji: '🧊' },
  { label: '🥤 Drinks',         emoji: '🥤' },
  { label: '🍪 Snacks',         emoji: '🍪' },
  { label: '🥫 Canned / Pantry',emoji: '🥫' },
  { label: '🧹 Cleaning',       emoji: '🧹' },
  { label: '🧴 Toiletries',     emoji: '🧴' },
  { label: '🍼 Baby',           emoji: '🍼' },
  { label: '🐾 Pets',           emoji: '🐾' },
  { label: '💊 Pharmacy',       emoji: '💊' },
  { label: '🧁 Sweets',         emoji: '🧁' },
  { label: '🛒 Other',          emoji: '🛒' },
];

// Large emoji palette for custom category creation
export const EMOJI_PALETTE = [
  '🍎','🍊','🍋','🍇','🍓','🫐','🍑','🍒','🥭','🍍',
  '🥝','🍅','🥑','🥦','🥬','🥒','🌽','🥕','🧅','🧄',
  '🥔','🍠','🥐','🍞','🥖','🧀','🥚','🍳','🥓','🥩',
  '🍗','🍖','🌭','🍔','🍟','🍕','🫓','🥙','🌮','🌯',
  '🥗','🍝','🍜','🍲','🍛','🍱','🥟','🥫','🍿','🧂',
  '🧃','🥤','🧋','☕','🍵','🍺','🥂','🍷','🧊','🧉',
  '🍦','🍧','🍩','🍪','🎂','🍰','🧁','🍫','🍬','🍭',
  '🧴','🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽','🪒',
  '💊','💉','🩹','🩺','🌡️','🍼','👶','🧸','🐾','🐶',
  '🐱','🐠','🐇','🌿','🌱','🌾','🫙','🏠','🔧','💡',
];

/**
 * Extracts just the emoji from a category label like "🥛 Dairy" → "🥛"
 * Falls back to "📦" if no emoji found.
 */
export function getCategoryEmoji(category?: string): string {
  if (!category) return '📦';
  // Match the leading emoji character(s)
  const match = category.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
  return match ? match[0] : '📦';
}
