import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportDeckAsCSV } from './exportCSV';

describe('exportDeckAsCSV', () => {
  beforeEach(() => {
  vi.stubGlobal('alert', vi.fn());
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:url'),
    revokeObjectURL: vi.fn(),
  });
});

  it('alerts if no cards are provided', () => {
    exportDeckAsCSV('My Deck', []);
    expect(window.alert).toHaveBeenCalledWith('No cards to export.');
  });

  it('creates and clicks a download link for valid cards', () => {
    const cards = [
      { front: 'Hello', back: 'World', card_type: 'concept', tags: ['basic'] },
      { front: 'Quote "this"', back: 'Multi\nLine', card_type: 'definition' },
    ];
    
    const clickMock = vi.fn();
    const mockLink = { click: clickMock, href: '', download: '' };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);

    exportDeckAsCSV('Test Deck', cards);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickMock).toHaveBeenCalled();
    expect(mockLink.download).toBe('Test_Deck_flashcards.csv');
  });
});
