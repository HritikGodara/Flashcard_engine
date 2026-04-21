# FlashEngine

A flashcard app that generates study cards from PDFs using AI. Upload any text-based PDF, and it creates a deck of Q&A cards within a minute or two. Then you study them using spaced repetition — the app decides which cards you need to see again today based on how well you knew each one.

Live: **[flashengine.vercel.app](https://flashengine.vercel.app)**

---

## What I built and why

The problem: students read things and then forget them, because reading without testing is basically just highlighting with extra steps.

So I built a tool that takes a PDF — a textbook chapter, a lecture handout, a paper — extracts the text, sends it to an AI in chunks, and gets back a deck of flashcards. After that, you study them using SM-2, the spaced repetition algorithm that Anki uses. Cards you know well get pushed out to next week. Cards you struggle with come back tomorrow.

The result is a full study loop from "I have this PDF" to "I've reviewed these cards three times over two weeks" without any manual card creation.

---

## How it works

**PDF ingestion:** PDF.js extracts raw text in the browser — no server upload needed. The text gets split into 500-800 word chunks based on heading structure and paragraph breaks.

**AI generation:** Each chunk goes to Puter.js, which gives free access to models like Claude and GPT-4 without an API key. The prompt asks for five card types per chunk: definitions, concept explanations, examples, edge cases, and fill-in-the-blank. Responses get deduplicated against each other before saving.

**Spaced repetition:** After studying, you rate each card 0-4 (the SM-2 scale). The algorithm recalculates each card's interval and next review date. New cards come back the next day; cards you know well get pushed out exponentially. The dashboard shows a 28-day contribution calendar and a mastery ring that fills as cards graduate to "mastered" status.

**Auth and persistence:** Supabase handles auth and PostgreSQL. Row-level security policies ensure users only ever see their own data. Nothing is shared across accounts.

---

## Key decisions

**Puter.js instead of OpenAI.** I wanted this to be genuinely free to use, not "free until you hit the rate limit." Puter.js lets users authenticate with their own Puter account (free tier) and the AI calls come out of their own quota. This means I'm not paying per token, users aren't paying per token, and the app can scale without a credit card.

The downside: response latency is unpredictable, and I have no control over which model version runs. I built in a fallback chain (claude-sonnet → gpt-4.1-nano) and chunk-by-chunk progress tracking so the UI doesn't just freeze while waiting.

**Chunking before sending to AI.** The first version sent the whole PDF as one prompt. That broke on anything longer than about 8 pages, and the card quality degraded — the model would just generate surface-level cards from the intro. Splitting into 500-800 word chunks with semantic boundaries (headings, paragraph breaks) gave better cards and made progress reporting possible.

**SM-2 instead of something simpler.** I could have done "review every card every day" or random shuffling. SM-2 is more complex to implement but it's what the research actually supports. The algorithm has been around since 1987 and is the basis for Anki, which has millions of users. I'd rather build on something proven than invent a worse version.

**Supabase over Firebase.** The free tier is more generous for a project like this (500MB database vs Firestore's 1GB, but relational queries are much easier to write than Firestore's document model). The RLS policies also let me write security rules directly in SQL rather than duplicating them in application code.

---

## Challenges

**The PDF.js worker.** PDF.js needs a separate worker thread to parse files without freezing the browser. In production, it tries to load the worker from a CDN URL, which the browser rejects as a dynamic import from a different origin. The fix was to use Vite's `?url` import syntax to bundle the worker locally and serve it from the same origin. This took longer than it should have, mostly because the error message ("Setting up fake worker") doesn't tell you what's actually wrong.

**Puter.js response parsing.** The AI sometimes returns JSON with minor formatting issues — trailing commas, missing brackets, extra text before the opening brace. Rather than failing on a bad response, the parser tries to extract a JSON array from the response text using a regex before falling back to skipping that chunk. Not elegant, but it means a single bad chunk doesn't kill the whole deck generation.

**Rate limiting on Puter.** During testing, rapid requests to Puter hit undocumented rate limits. I added a 500ms delay between chunk requests and limited processing to 5 chunks per deck (covering most practical PDFs). Bigger PDFs work, they just process the first five sections rather than every page.

---

## What I'd add with more time

The thing that's most obviously missing is a way to add cards manually. Right now if a PDF generates a bad card, you can edit or delete it, but you can't create one from scratch without uploading something. That should take a few hours to add.

After that: import from Anki (APKG format, which is just SQLite), so people with existing decks don't have to start over. And a proper review queue page that shows which decks have cards due today, so you don't have to go into each deck individually.

The PDF parsing is also pretty basic. Right now it treats all text as one flat stream and tries to detect headings by font size. For PDFs that use different layout conventions (multi-column, footnotes, sidebars), the extracted text gets scrambled. A more sophisticated layout analysis would help.

---

## Security

No API keys are stored or transmitted. Supabase credentials (URL and anon key) are environment variables, excluded from the repo via `.gitignore`. The anon key is safe to expose publicly — it's not a secret, and Supabase's RLS policies control what it can access. All data access goes through user-authenticated requests; unauthenticated requests return nothing.

The `.env.example` file in the repo shows the required variables without actual values.

---

## Running it locally

```bash
git clone https://github.com/HritikGodara/FlashEngine.git
cd FlashEngine
npm install
```

Create `.env` with your Supabase credentials:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Run the SQL in `supabase_schema.sql` in your Supabase SQL editor, then:

```bash
npm run dev
```

---

## Stack

- React + Vite
- Supabase (PostgreSQL + Auth)
- Puter.js (AI generation)
- PDF.js (in-browser PDF parsing)
- canvas-confetti (session complete celebration)
- Deployed on Vercel
