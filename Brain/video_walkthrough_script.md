# Video walkthrough script (2-5 minutes)

Use this as a loose guide, not a teleprompter. Talk over it.

---

## Opening (0:00 - 0:20)

Pull up the live app. Don't introduce yourself yet, just start using it.

"So the idea is simple. You have a PDF — textbook chapter, research paper, lecture notes — and instead of reading it and hoping something sticks, you get flashcards out of it. Then you study those with spaced repetition."

---

## Sign up and orientation (0:20 - 0:45)

Sign in (you should already be logged in to skip this step if possible).

Land on the home page. Show the empty state briefly.

"The app knows three things: your decks, your cards, and your review history. Everything lives in Supabase — it's actual persistent data per user."

---

## Create a deck + PDF upload (0:45 - 1:30)

Click "Create New Deck". Show the modal.

Type a title. Then drag a PDF in (have one ready — something with at least 3-4 pages of real text content, e.g. a biology chapter or CS paper).

"The PDF never leaves the browser. PDF.js parses it locally, the text gets chunked into 500-800 word sections, and each chunk goes to an AI."

Click create. Watch the progress bar tick through the chunks.

"This is hitting Puter.js — it's free AI, no API key on my end, no cost to the user. Each chunk comes back as JSON, gets parsed, deduplicated, and saved."

---

## The deck page (1:30 - 2:00)

Show the generated deck. Browse a few cards. 

"These are the five card types it generates: definitions, concept cards, examples, edge cases, and fill-in-the-blank. The variety is intentional — testing the same concept in different ways means you actually learn it, you don't just pattern match to a question format."

Show the edit/delete buttons briefly. Show the export CSV button.

"You can edit any card, delete ones that are wrong, and export the whole thing to CSV if you want to use it somewhere else."

---

## Study mode (2:00 - 3:00)

Click "Study Now". Show the study interface.

Flip a card. Show the rating bar: 0 through 4.

"0 means I had no idea. 4 means perfect recall. The SM-2 algorithm — same one Anki uses — takes that rating and recalculates when this card should come back. Rate it 4 and you won't see it for a week. Rate it 0 and it comes back tomorrow."

Do 4-5 cards. Show the streak counter if it triggers. Get to a session complete and show the confetti briefly.

"Keyboard shortcuts: space to flip, 0-4 to rate. Once you've done it a few times it's pretty fast."

---

## Dashboard (3:00 - 3:30)

Navigate to Dashboard.

"The calendar shows the last 28 days. The ring is total mastered cards over total cards. The streak is how many consecutive days you've studied."

Show the stats numbers briefly. Don't over-explain.

---

## Wrap (3:30 - 4:00)

Go back to the home screen.

"Three days to build this. The main thing I'd add is manual card creation — right now you need a PDF to make cards, which is a real limitation. And the PDF parsing could be smarter for multi-column layouts.

But it works end to end: PDF in, cards out, spaced repetition, persistent across sessions. That was the goal."

Stop recording.

---

## Tips for the recording

- Keep the browser window at a reasonable size so text is readable
- Turn off notifications
- Have a real PDF ready (not a scanned image — needs text layer)
- Don't rush the study mode section, it's the core feature
- You don't need to read this script out loud word for word, it's just structure
