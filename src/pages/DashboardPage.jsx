import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { deckService, reviewService } from '../services/dataService';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [decks, setDecks] = useState([]);
  const [reviewHistory, setReviewHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    try {
      const [statsData, decksData, historyData] = await Promise.all([
        reviewService.getStats(),
        deckService.getAll(),
        reviewService.getHistory(30),
      ]);
      setStats(statsData);
      setDecks(decksData);
      setReviewHistory(historyData);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <div className="spinner spinner-lg" style={{ margin: '0 auto' }} />
      </div>
    );
  }

  // Build contribution calendar data (last 28 days)
  const calendarData = buildCalendarData(reviewHistory);

  return (
    <div className="container animate-fadeIn">
      <div className="page-header">
        <h1 className="heading-2">Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Your learning progress at a glance</p>
      </div>

      {/* Stats Grid */}
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
            {stats.totalCards > 0 && (
              <div className="stat-card-change">
                {Math.round((stats.masteredCards / stats.totalCards) * 100)}% of all cards
              </div>
            )}
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

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
        {/* Review Activity */}
        <div className="card">
          <h3 className="heading-4" style={{ marginBottom: 'var(--space-4)' }}>
            Review Activity
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
            Last 28 days
          </p>
          <div className="contrib-calendar">
            {calendarData.map((day, i) => (
              <div
                key={i}
                className={`contrib-day level-${day.level}`}
                title={`${day.date}: ${day.count} reviews`}
              />
            ))}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
            gap: 'var(--space-1)', marginTop: 'var(--space-3)',
            fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
          }}>
            <span>Less</span>
            <div className="contrib-day level-0" style={{ width: 12, height: 12 }} />
            <div className="contrib-day level-1" style={{ width: 12, height: 12 }} />
            <div className="contrib-day level-2" style={{ width: 12, height: 12 }} />
            <div className="contrib-day level-3" style={{ width: 12, height: 12 }} />
            <div className="contrib-day level-4" style={{ width: 12, height: 12 }} />
            <span>More</span>
          </div>
        </div>

        {/* Mastery Overview */}
        <div className="card">
          <h3 className="heading-4" style={{ marginBottom: 'var(--space-4)' }}>
            Mastery Overview
          </h3>
          {stats && stats.totalCards > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
              <MasteryRing percentage={Math.round((stats.masteredCards / stats.totalCards) * 100)} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
              <p>Start studying to see mastery progress</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Decks */}
      <div className="card" style={{ marginBottom: 'var(--space-8)' }}>
        <h3 className="heading-4" style={{ marginBottom: 'var(--space-4)' }}>
          Your Decks
        </h3>
        {decks.length === 0 ? (
          <p style={{ color: 'var(--text-tertiary)' }}>No decks yet. Create one to get started!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {decks.map(deck => (
              <Link
                key={deck.id}
                to={`/deck/${deck.id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none', color: 'inherit',
                  transition: 'background var(--transition-fast)',
                }}
                className="card-interactive"
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: deck.color, flexShrink: 0,
                  }} />
                  <span style={{ fontWeight: 600 }}>{deck.title}</span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                    {deck.card_count} cards
                  </span>
                </div>
                <Link to={`/study/${deck.id}`} className="btn btn-sm btn-primary" onClick={e => e.stopPropagation()}>
                  Study
                </Link>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MasteryRing({ percentage }) {
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="mastery-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="var(--success-500)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <span className="mastery-ring-label">{percentage}%</span>
    </div>
  );
}

function buildCalendarData(reviews) {
  const days = [];
  const reviewCounts = {};

  reviews.forEach(r => {
    const date = new Date(r.reviewed_at).toISOString().split('T')[0];
    reviewCounts[date] = (reviewCounts[date] || 0) + 1;
  });

  for (let i = 27; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = reviewCounts[dateStr] || 0;

    let level = 0;
    if (count >= 20) level = 4;
    else if (count >= 10) level = 3;
    else if (count >= 5) level = 2;
    else if (count >= 1) level = 1;

    days.push({ date: dateStr, count, level });
  }

  return days;
}
