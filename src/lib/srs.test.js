import { describe, it, expect } from 'vitest';
import { processReview, getStateLabel, getRatingLabel } from './srs';

describe('SRS algorithm tests', () => {
  it('correctly processes a failed review', () => {
    const initialState = {
      easiness_factor: 2.5,
      interval: 3,
      repetitions: 2,
    };
    const newState = processReview(initialState, 1);
    expect(newState.interval).toBe(1);
    expect(newState.repetitions).toBe(0);
    expect(newState.state).toBe('learning');
    expect(newState.easiness_factor).toBeLessThan(2.5);
  });

  it('correctly advances a passed review', () => {
    const initialState = {
      easiness_factor: 2.5,
      interval: 1,
      repetitions: 0,
    };
    const newState = processReview(initialState, 4);
    expect(newState.interval).toBe(1);
    expect(newState.repetitions).toBe(1);
    expect(newState.easiness_factor).toBeGreaterThanOrEqual(2.5);
  });
  
  it('identifies labels correctly', () => {
    expect(getStateLabel('new')).toBe('New');
    expect(getRatingLabel(4)).toBe('Easy');
  });
});
