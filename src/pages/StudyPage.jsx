import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { deckService, cardStateService, reviewService } from '../services/dataService';
import { processReview, getRatingLabel } from '../lib/srs';

export default function StudyPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [sessionStats, setSessionStats] = useState({ total: 0, correct: 0, wrong: 0 });

  const loadStudySession = useCallback(async () => {
    try {
      const deckData = await deckService.getById(id);
      setDeck(deckData);

      const reviewQueue = await cardStateService.getReviewQueue(id);
      setQueue(reviewQueue);

      if (reviewQueue.length === 0) {
        setSessionComplete(true);
      }

      setStartTime(Date.now());
    } catch (err) {
      console.error('Error loading study session:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadStudySession();
  }, [loadStudySession]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (sessionComplete) return;

      if (e.code === 'Space' && !isFlipped) {
        e.preventDefault();
        flipCard();
      } else if (isFlipped && e.key >= '0' && e.key <= '4') {
        e.preventDefault();
        handleRating(parseInt(e.key));
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFlipped, sessionComplete, currentIndex, handleRating]);

  function flipCard() {
    setIsFlipped(true);
  }

  const handleRating = useCallback(async (rating) => {
    const current = queue[currentIndex];
    if (!current) return;

    const timeSpent = Date.now() - (startTime || Date.now());

    // Get or create card state
    let cardState = current.state;
    if (!cardState) {
      cardState = await cardStateService.getOrCreate(current.card.id);
    }

    // Process the review with SM-2
    const newState = processReview(cardState, rating);

    // Save to database
    await Promise.all([
      cardStateService.update(cardState.id, newState),
      reviewService.submit({
        cardId: current.card.id,
        rating,
        timeSpentMs: timeSpent,
      }),
    ]);

    // Update streak
    if (rating >= 2) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);
      setSessionStats(prev => ({ ...prev, total: prev.total + 1, correct: prev.correct + 1 }));
    } else {
      setStreak(0);
      setSessionStats(prev => ({ ...prev, total: prev.total + 1, wrong: prev.wrong + 1 }));
    }

    // Move to next card
    if (currentIndex + 1 >= queue.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setStartTime(Date.now());
    }
  }, [queue, currentIndex, startTime, streak, maxStreak]);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
        <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>
          Building your review queue...
        </p>
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="container">
        <SessionComplete
          deck={deck}
          stats={sessionStats}
          maxStreak={maxStreak}
          onGoBack={() => navigate(`/deck/${id}`)}
          isEmpty={queue.length === 0}
        />
      </div>
    );
  }

  const currentCard = queue[currentIndex]?.card;
  const progress = ((currentIndex) / queue.length) * 100;

  return (
    <div className="container" style={{ paddingTop: 'var(--space-6)' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <Link
          to={`/deck/${id}`}
          style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
        >
          ✕ End Session
        </Link>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {deck?.title}
        </span>
        {streak > 1 && (
          <span className="study-streak" style={{ animation: 'scaleIn 0.3s ease' }}>
            🔥 {streak}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="study-progress">
        <div className="study-progress-bar">
          <div className="study-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="study-progress-text">
          <span>{currentIndex + 1} of {queue.length}</span>
          <span>{queue.length - currentIndex - 1} remaining</span>
        </div>
      </div>

      {/* Flashcard */}
      <div className="flashcard-container" style={{ marginTop: 'var(--space-8)' }}>
        <div
          className={`flashcard ${isFlipped ? 'flipped' : ''}`}
          onClick={() => !isFlipped && flipCard()}
          role="button"
          tabIndex={0}
          aria-label={isFlipped ? 'Answer shown' : 'Click to reveal answer'}
        >
          {/* Front */}
          <div className="flashcard-face front">
            <span className="flashcard-label">Question</span>
            <p className="flashcard-content">{currentCard?.front}</p>
            {!isFlipped && (
              <span className="flashcard-hint">
                Click or press Space to flip
              </span>
            )}
          </div>

          {/* Back */}
          <div className="flashcard-face back">
            <span className="flashcard-label">Answer</span>
            <p className="flashcard-content">{currentCard?.back}</p>
          </div>
        </div>
      </div>

      {/* Rating Buttons */}
      {isFlipped && (
        <div className="rating-bar animate-fadeIn">
          {[0, 1, 2, 3, 4].map(rating => (
            <button
              key={rating}
              className={`rating-btn rating-${rating}`}
              onClick={() => handleRating(rating)}
            >
              <span>{getRatingLabel(rating)}</span>
              <span className="key-hint">Press {rating}</span>
            </button>
          ))}
        </div>
      )}

      {/* Motivational text */}
      {!isFlipped && (
        <p style={{
          textAlign: 'center', color: 'var(--text-tertiary)',
          fontSize: 'var(--text-sm)', marginTop: 'var(--space-8)',
        }}>
          {getMotivationalText(currentIndex, queue.length, streak)}
        </p>
      )}
    </div>
  );
}

function SessionComplete({ deck, stats, maxStreak, onGoBack, isEmpty }) {
  useEffect(() => {
    // Fire confetti if there were reviews
    if (!isEmpty && stats.total > 0) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isEmpty, stats.total]);

  if (isEmpty) {
    return (
      <div className="session-complete">
        <div className="session-complete-icon">🎯</div>
        <h2 className="heading-2">All caught up!</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
          No cards are due for review right now. Come back later when cards are scheduled.
        </p>
        <button className="btn btn-primary btn-lg" onClick={onGoBack} style={{ marginTop: 'var(--space-8)' }}>
          Back to Deck
        </button>
      </div>
    );
  }

  return (
    <div className="session-complete">
      <div className="session-complete-icon">🎉</div>
      <h2 className="heading-2">Session Complete!</h2>
      <p style={{ color: 'var(--text-secondary)' }}>
        Great work studying <strong>{deck?.title}</strong>
      </p>

      <div className="session-stats">
        <div className="session-stat">
          <div className="session-stat-value">{stats.total}</div>
          <div className="session-stat-label">Cards Reviewed</div>
        </div>
        <div className="session-stat">
          <div className="session-stat-value" style={{ color: 'var(--success-500)' }}>
            {stats.correct}
          </div>
          <div className="session-stat-label">Correct</div>
        </div>
        <div className="session-stat">
          <div className="session-stat-value" style={{ color: 'var(--accent-500)' }}>
            🔥 {maxStreak}
          </div>
          <div className="session-stat-label">Best Streak</div>
        </div>
        <div className="session-stat">
          <div className="session-stat-value">
            {stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0}%
          </div>
          <div className="session-stat-label">Accuracy</div>
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={onGoBack} style={{ marginTop: 'var(--space-4)' }}>
        Back to Deck
      </button>
    </div>
  );
}

function getMotivationalText(current, total, streak) {
  const remaining = total - current;

  if (streak >= 5) return `🔥 ${streak} in a row! You're on fire!`;
  if (remaining <= 3) return "Almost there — you've got this! 💪";
  if (remaining <= Math.floor(total / 2)) return `Halfway through — keep going!`;
  if (current === 0) return "Let's build some knowledge 🧠";
  return "Take your time, recall matters more than speed ⏱️";
}
