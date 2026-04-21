/**
 * Export a deck's cards as CSV file.
 * 
 * @param {string} deckTitle - Title of the deck (used for filename)
 * @param {Array} cards - Array of card objects with front, back, card_type, tags
 */
export function exportDeckAsCSV(deckTitle, cards) {
  if (!cards || cards.length === 0) {
    alert('No cards to export.');
    return;
  }

  const headers = ['Front', 'Back', 'Type', 'Tags', 'Difficulty'];
  const rows = cards.map(card => [
    escapeCSV(card.front),
    escapeCSV(card.back),
    escapeCSV(card.card_type || 'definition'),
    escapeCSV(Array.isArray(card.tags) ? card.tags.join('; ') : ''),
    card.difficulty_hint || 1,
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${deckTitle.replace(/[^a-z0-9]/gi, '_')}_flashcards.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(str) {
  if (!str) return '""';
  const s = String(str);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
