/**
 * AI Card Generation using Puter.js
 *
 * Puter.js provides free AI text generation in the browser.
 * Users authenticate via their free Puter.com account.
 * The `puter` global is available after loading the Puter.js script.
 */

const CARD_GENERATION_PROMPT = `You are an expert teacher and flashcard creator. Given the following text from a study document, generate high-quality flashcards that aid long-term retention through active recall.

Generate flashcards across these categories:
1. **definition** — Key terms and their definitions
2. **concept** — Conceptual relationships ("How does X relate to Y?")
3. **example** — Worked examples or practical applications
4. **edge_case** — Common misconceptions or edge cases
5. **fill_blank** — Fill-in-the-blank for important facts/formulas

Rules:
- Front (question) should be clear and specific
- Back (answer) should be concise (1-3 sentences max)
- Don't create cards where front and back are nearly identical
- Focus on the most important and testable concepts
- Generate 5-10 cards per chunk depending on content density

Return ONLY a valid JSON array with this exact format (no markdown, no explanation):
[
  {
    "front": "question text here",
    "back": "answer text here",
    "card_type": "definition|concept|example|edge_case|fill_blank",
    "difficulty_hint": 1-3,
    "tags": ["tag1", "tag2"]
  }
]

---

TEXT TO PROCESS:
`;

/**
 * Check if Puter.js is loaded and available.
 */
function isPuterAvailable() {
  return typeof window !== 'undefined' && window.puter && window.puter.ai;
}

/**
 * Generate flashcards from a text chunk using Puter.js AI.
 *
 * @param {string} textChunk - The text content to generate cards from
 * @returns {Promise<Array>} Array of generated card objects
 */
export async function generateCardsFromChunk(textChunk) {
  if (!isPuterAvailable()) {
    throw new Error('Puter.js is not loaded. Please make sure the Puter.js script is included.');
  }

  const prompt = CARD_GENERATION_PROMPT + textChunk;

  try {
    const response = await window.puter.ai.chat(prompt, {
      model: 'claude-sonnet-4-20250514',
    });

    // Extract the text content from the response
    const text = typeof response === 'string'
      ? response
      : response?.message?.content || response?.toString() || '';

    // Parse the JSON response
    const cards = parseCardResponse(text);
    return cards;
  } catch (error) {
    console.error('AI generation error:', error);

    // If claude-sonnet-4-20250514 fails, try a fallback model
    try {
      const response = await window.puter.ai.chat(prompt, {
        model: 'gpt-4.1-nano',
      });

      const text = typeof response === 'string'
        ? response
        : response?.message?.content || response?.toString() || '';

      return parseCardResponse(text);
    } catch (fallbackError) {
      console.error('Fallback AI generation error:', fallbackError);
      throw new Error('Failed to generate cards. Please try again.');
    }
  }
}

/**
 * Generate cards from multiple chunks with progress tracking.
 *
 * @param {string[]} chunks - Array of text chunks
 * @param {function} onProgress - Callback with (completedChunks, totalChunks, cards)
 * @returns {Promise<Array>} All generated cards
 */
export async function generateCardsFromChunks(chunks, onProgress) {
  const allCards = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const cards = await generateCardsFromChunk(chunks[i]);
      allCards.push(...cards);

      if (onProgress) {
        onProgress(i + 1, chunks.length, allCards);
      }
    } catch (error) {
      console.error(`Error generating cards for chunk ${i + 1}:`, error);
      // Continue with next chunk
      if (onProgress) {
        onProgress(i + 1, chunks.length, allCards);
      }
    }
  }

  // Deduplicate cards
  const deduped = deduplicateCards(allCards);
  return deduped;
}

/**
 * Parse the AI response text into card objects.
 */
function parseCardResponse(text) {
  // Try to extract JSON array from the response
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // Try to find a JSON array in the text
  const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const cards = JSON.parse(jsonStr);

    if (!Array.isArray(cards)) {
      console.error('AI response is not an array');
      return [];
    }

    // Validate and clean each card
    return cards
      .filter(card => card.front && card.back)
      .map(card => ({
        front: String(card.front).trim(),
        back: String(card.back).trim(),
        card_type: ['definition', 'concept', 'example', 'edge_case', 'fill_blank']
          .includes(card.card_type) ? card.card_type : 'definition',
        difficulty_hint: Math.min(3, Math.max(1, parseInt(card.difficulty_hint) || 1)),
        tags: Array.isArray(card.tags) ? card.tags.map(String) : [],
      }));
  } catch (error) {
    console.error('Failed to parse AI response as JSON:', error);
    console.log('Raw response:', text.substring(0, 500));
    return [];
  }
}

/**
 * Remove duplicate cards (based on similar fronts).
 */
function deduplicateCards(cards) {
  const seen = new Set();
  return cards.filter(card => {
    const normalized = card.front.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
