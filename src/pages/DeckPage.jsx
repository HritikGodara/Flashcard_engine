import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { deckService, cardService, cardStateService } from '../services/dataService';
import { getStateLabel, getStateColor } from '../lib/srs';
import { exportDeckAsCSV } from '../lib/exportCSV';

export default function DeckPage() {
  const { id } = useParams();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [cardStates, setCardStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState(null);

  const loadDeck = useCallback(async () => {
    try {
      const [deckData, cardsData] = await Promise.all([
        deckService.getById(id),
        cardService.getByDeck(id),
      ]);
      setDeck(deckData);
      setCards(cardsData);

      // Load card states
      try {
        const states = await cardStateService.getByDeck(id);
        const stateMap = {};
        states.forEach(s => { stateMap[s.card_id] = s; });
        setCardStates(stateMap);
      } catch {
        // State loading is non-critical
      }
    } catch (err) {
      console.error('Error loading deck:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  async function handleDeleteCard(cardId) {
    try {
      await cardService.delete(cardId);
      setCards(prev => prev.filter(c => c.id !== cardId));
      await deckService.updateCardCount(id);
    } catch (err) {
      console.error('Error deleting card:', err);
    }
  }

  async function handleUpdateCard(cardId, updates) {
    try {
      const updated = await cardService.update(cardId, updates);
      setCards(prev => prev.map(c => c.id === cardId ? updated : c));
      setEditingCard(null);
    } catch (err) {
      console.error('Error updating card:', err);
    }
  }

  // Count cards by state
  const stateCount = { new: 0, learning: 0, review: 0, mastered: 0 };
  cards.forEach(card => {
    const state = cardStates[card.id]?.state || 'new';
    stateCount[state] = (stateCount[state] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <p>Deck not found.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>Go Home</Link>
      </div>
    );
  }

  return (
    <div className="container animate-fadeIn">
      {/* Header */}
      <div style={{ paddingTop: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
        <Link to="/" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', display: 'inline-block' }}>
          ← Back to Decks
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 'var(--space-2)' }}>
          <div>
            <h1 className="heading-2" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{
                width: 12, height: 12, borderRadius: 'var(--radius-full)',
                background: deck.color, display: 'inline-block', flexShrink: 0,
              }} />
              {deck.title}
            </h1>
            {deck.description && (
              <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                {deck.description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {cards.length > 0 && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => exportDeckAsCSV(deck.title, cards)}
                >
                  📥 Export CSV
                </button>
                <Link to={`/study/${id}`} className="btn btn-primary">
                  ▶ Study Now
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* State Summary */}
      <div style={{
        display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-8)',
        flexWrap: 'wrap',
      }}>
        {Object.entries(stateCount).map(([state, count]) => (
          <div key={state} className="badge" style={{
            background: `${getStateColor(state)}15`,
            color: getStateColor(state),
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-sm)',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: getStateColor(state), display: 'inline-block',
            }} />
            {getStateLabel(state)}: {count}
          </div>
        ))}
      </div>

      {/* Cards List */}
      <h2 className="heading-4" style={{ marginBottom: 'var(--space-4)' }}>
        Cards ({cards.length})
      </h2>

      {cards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🃏</div>
          <h3 className="empty-state-title">No cards yet</h3>
          <p className="empty-state-desc">
            This deck doesn't have any cards. Go back and create a deck with a PDF to generate cards.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {cards.map((card, index) => (
            <div key={card.id} className="card" style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-5)',
            }}>
              {editingCard === card.id ? (
                <EditCardForm
                  card={card}
                  onSave={(updates) => handleUpdateCard(card.id, updates)}
                  onCancel={() => setEditingCard(null)}
                />
              ) : (
                <>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                        #{index + 1}
                      </span>
                      <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                        {card.card_type}
                      </span>
                      {cardStates[card.id] && (
                        <span className="badge" style={{
                          background: `${getStateColor(cardStates[card.id].state)}15`,
                          color: getStateColor(cardStates[card.id].state),
                          fontSize: '10px',
                        }}>
                          {getStateLabel(cardStates[card.id].state)}
                        </span>
                      )}
                    </div>
                    <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{card.front}</p>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{card.back}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-1)', alignSelf: 'center' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => setEditingCard(card.id)}
                      title="Edit card"
                    >✏️</button>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={() => handleDeleteCard(card.id)}
                      title="Delete card"
                    >🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditCardForm({ card, onSave, onCancel }) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div className="input-group">
        <label className="input-label">Front (Question)</label>
        <textarea className="input" value={front} onChange={e => setFront(e.target.value)}
          rows={2} style={{ resize: 'vertical' }} />
      </div>
      <div className="input-group">
        <label className="input-label">Back (Answer)</label>
        <textarea className="input" value={back} onChange={e => setBack(e.target.value)}
          rows={2} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave({ front, back })}>Save</button>
      </div>
    </div>
  );
}
