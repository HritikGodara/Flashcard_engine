/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Modified SuperMemo-2 algorithm for flashcard review scheduling.
 *
 * Rating Scale:
 *   0 — Blackout (no memory at all)
 *   1 — Wrong but recognized after seeing answer
 *   2 — Hard (correct with significant difficulty)
 *   3 — Good (correct with minor hesitation)
 *   4 — Easy (instant, confident recall)
 */

/**
 * Process a review and return updated card state.
 *
 * @param {Object} currentState - Current card state
 * @param {number} currentState.easiness_factor - EF (default 2.5, min 1.3)
 * @param {number} currentState.interval - Days until next review
 * @param {number} currentState.repetitions - Consecutive correct reviews
 * @param {number} rating - User's recall rating (0-4)
 * @returns {Object} Updated card state
 */
export function processReview(currentState, rating) {
  let { easiness_factor: ef, interval, repetitions } = currentState;

  // Update easiness factor
  ef = ef + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  ef = Math.max(1.3, ef); // EF minimum is 1.3

  let newState;

  if (rating < 2) {
    // Failed — reset to beginning
    repetitions = 0;
    interval = 1;
    newState = 'learning';
  } else {
    // Passed — advance
    repetitions += 1;

    if (repetitions === 1) {
      interval = 1;
      newState = 'learning';
    } else if (repetitions === 2) {
      interval = 3;
      newState = 'learning';
    } else if (repetitions === 3) {
      interval = 7;
      newState = 'review';
    } else {
      interval = Math.round(interval * ef);
      newState = interval >= 14 ? 'mastered' : 'review';
    }
  }

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easiness_factor: Math.round(ef * 100) / 100,
    interval,
    repetitions,
    next_review_date: nextReviewDate.toISOString().split('T')[0],
    state: newState,
  };
}

/**
 * Get a human-readable label for a card state.
 */
export function getStateLabel(state) {
  const labels = {
    new: 'New',
    learning: 'Learning',
    review: 'Review',
    mastered: 'Mastered',
  };
  return labels[state] || 'Unknown';
}

/**
 * Get the color associated with a card state.
 */
export function getStateColor(state) {
  const colors = {
    new: '#94A3B8',       // neutral
    learning: '#F59E0B',  // amber
    review: '#6366F1',    // indigo
    mastered: '#10B981',  // green
  };
  return colors[state] || '#94A3B8';
}

/**
 * Get rating label.
 */
export function getRatingLabel(rating) {
  const labels = ['Blackout', 'Forgot', 'Hard', 'Good', 'Easy'];
  return labels[rating] || '';
}

/**
 * Get rating color.
 */
export function getRatingColor(rating) {
  const colors = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#6366F1'];
  return colors[rating] || '#94A3B8';
}
