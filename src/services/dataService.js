import { supabase } from './supabase';

const DECK_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#06B6D4', '#F43F5E', '#3B82F6',
];

function randomColor() {
  return DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)];
}

export const deckService = {
  async getAll() {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create({ title, description }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('decks')
      .insert({
        title,
        description: description || '',
        color: randomColor(),
        user_id: user.id,
        card_count: 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('decks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('decks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateCardCount(deckId) {
    const { count, error: countError } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('deck_id', deckId);
    if (countError) throw countError;

    const { error } = await supabase
      .from('decks')
      .update({ card_count: count, updated_at: new Date().toISOString() })
      .eq('id', deckId);
    if (error) throw error;
  },
};

export const cardService = {
  async getByDeck(deckId) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  async create(card) {
    const { data, error } = await supabase
      .from('cards')
      .insert(card)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createMany(cards) {
    const { data, error } = await supabase
      .from('cards')
      .insert(cards)
      .select();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('cards')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const cardStateService = {
  async getByDeck(deckId) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('card_states')
      .select('*, cards!inner(deck_id)')
      .eq('cards.deck_id', deckId)
      .eq('user_id', user.id);
    if (error) throw error;
    return data;
  },

  async getOrCreate(cardId) {
    const { data: { user } } = await supabase.auth.getUser();

    // Try to get existing state
    const { data: existing } = await supabase
      .from('card_states')
      .select('*')
      .eq('card_id', cardId)
      .eq('user_id', user.id)
      .single();

    if (existing) return existing;

    // Create new state
    const { data, error } = await supabase
      .from('card_states')
      .insert({
        card_id: cardId,
        user_id: user.id,
        easiness_factor: 2.5,
        interval: 0,
        repetitions: 0,
        next_review_date: new Date().toISOString().split('T')[0],
        state: 'new',
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('card_states')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getReviewQueue(deckId) {
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split('T')[0];

    // Get all cards for this deck
    const { data: cards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('deck_id', deckId);
    if (cardsError) throw cardsError;

    // Get all card states for this user
    const { data: states, error: statesError } = await supabase
      .from('card_states')
      .select('*')
      .eq('user_id', user.id)
      .in('card_id', cards.map(c => c.id));
    if (statesError) throw statesError;

    const stateMap = {};
    states.forEach(s => { stateMap[s.card_id] = s; });

    const dueCards = [];
    const newCards = [];
    const strugglingCards = [];

    for (const card of cards) {
      const state = stateMap[card.id];
      if (!state || state.state === 'new') {
        newCards.push({ card, state });
      } else if (state.next_review_date <= today) {
        if (state.easiness_factor < 1.8) {
          strugglingCards.push({ card, state });
        } else {
          dueCards.push({ card, state });
        }
      }
    }

    // Sort due cards by most overdue first
    dueCards.sort((a, b) => {
      const dateA = a.state?.next_review_date || today;
      const dateB = b.state?.next_review_date || today;
      return dateA.localeCompare(dateB);
    });

    // Limit new cards to 10 per session
    const limitedNew = newCards.slice(0, 10);

    return [...strugglingCards, ...dueCards, ...limitedNew];
  },
};

export const reviewService = {
  async submit({ cardId, rating, timeSpentMs }) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        card_id: cardId,
        user_id: user.id,
        rating,
        time_spent_ms: timeSpentMs,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getHistory(days = 30) {
    const { data: { user } } = await supabase.auth.getUser();
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .gte('reviewed_at', since.toISOString())
      .order('reviewed_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getStats() {
    const { data: { user } } = await supabase.auth.getUser();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      { count: totalCards },
      { count: masteredCards },
      { count: reviewsToday },
      { data: recentReviews }
    ] = await Promise.all([
      supabase
        .from('card_states')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
        
      supabase
        .from('card_states')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('state', 'mastered'),
        
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('reviewed_at', todayStart.toISOString()),
        
      supabase
        .from('reviews')
        .select('reviewed_at')
        .eq('user_id', user.id)
        .order('reviewed_at', { ascending: false })
        .limit(100)
    ]);

    const streak = calculateStreak(recentReviews || []);

    return {
      totalCards: totalCards || 0,
      masteredCards: masteredCards || 0,
      reviewsToday: reviewsToday || 0,
      streak,
    };
  },
};

function calculateStreak(reviews) {
  if (!reviews.length) return 0;

  const reviewDates = new Set(
    reviews.map(r => new Date(r.reviewed_at).toISOString().split('T')[0])
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    if (reviewDates.has(dateStr)) {
      streak++;
    } else if (i === 0) {
      // Today hasn't been reviewed yet, that's OK
      continue;
    } else {
      break;
    }
  }

  return streak;
}
