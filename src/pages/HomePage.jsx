import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deckService, reviewService } from '../services/dataService';
import CreateDeckModal from '../components/CreateDeckModal';

export default function HomePage() {
  const [decks, setDecks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  async function loadData() {
    try {
      const [decksData, statsData] = await Promise.all([
        deckService.getAll(),
        reviewService.getStats(),
      ]);
      setDecks(decksData);
      setStats(statsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDeckCreated(newDeck) {
    setDecks(prev => [newDeck, ...prev]);
    setShowCreateModal(false);
  }

  async function handleDeleteDeck(deckId) {
    if (!confirm('Are you sure you want to delete this deck?')) return;
    try {
      await deckService.delete(deckId);
      setDecks(prev => prev.filter(d => d.id !== deckId));
    } catch (err) {
      console.error('Error deleting deck:', err);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  return (
    <div className="container animate-fadeIn">
      {/* Stats Overview */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="stat-card">
            <div className="stat-card-label">Total Cards</div>
            <div className="stat-card-value">{stats.totalCards}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Mastered</div>
            <div className="stat-card-value" style={{ color: 'var(--success-500)' }}>
              {stats.masteredCards}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Reviews Today</div>
            <div className="stat-card-value" style={{ color: 'var(--primary-500)' }}>
              {stats.reviewsToday}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Study Streak</div>
            <div className="stat-card-value">
              <span style={{ color: 'var(--accent-500)' }}>🔥 {stats.streak}</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginLeft: 'var(--space-1)' }}>days</span>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="heading-2">Your Decks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {decks.length} {decks.length === 1 ? 'deck' : 'decks'}
          </p>
        </div>
      </div>

      {/* Deck Grid */}
      <div className="deck-grid stagger-children">
        {/* New Deck Card */}
        <button
          className="deck-card-new"
          onClick={() => setShowCreateModal(true)}
          id="create-deck-btn"
        >
          <span className="icon">＋</span>
          <span style={{ fontWeight: 600 }}>Create New Deck</span>
          <span style={{ fontSize: 'var(--text-xs)' }}>Upload a PDF or create manually</span>
        </button>

        {decks.map(deck => (
          <div key={deck.id} className="deck-card" style={{ position: 'relative' }}>
            <Link to={`/deck/${deck.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="deck-card-banner" style={{ background: deck.color || 'var(--primary-500)' }} />
              <div className="deck-card-body">
                <h3 className="deck-card-title">{deck.title}</h3>
                {deck.description && (
                  <p className="deck-card-desc">{deck.description}</p>
                )}
                <div className="deck-card-stats">
                  <span className="deck-card-stat">📚 {deck.card_count || 0} cards</span>
                  <span className="deck-card-stat">
                    🕐 {new Date(deck.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
            <button
              className="btn btn-ghost btn-icon"
              style={{
                position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)',
                fontSize: '14px', color: 'var(--text-tertiary)', zIndex: 2,
              }}
              onClick={(e) => { e.preventDefault(); handleDeleteDeck(deck.id); }}
              title="Delete deck"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {decks.length === 0 && (
        <div className="empty-state" style={{ paddingTop: 'var(--space-8)' }}>
          <div className="empty-state-icon">📖</div>
          <h3 className="empty-state-title">No decks yet</h3>
          <p className="empty-state-desc">
            Upload a PDF or create your first deck to start studying with spaced repetition.
          </p>
        </div>
      )}

      {showCreateModal && (
        <CreateDeckModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleDeckCreated}
        />
      )}
    </div>
  );
}
