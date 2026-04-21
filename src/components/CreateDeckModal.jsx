import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { deckService, cardService } from '../services/dataService';
import { extractTextFromPDF } from '../lib/pdfParser';
import { generateCardsFromChunks } from '../lib/aiGenerator';

export default function CreateDeckModal({ onClose, onCreated }) {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // form | uploading | generating | done
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ phase: '', percent: 0, detail: '' });
  const fileRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace('.pdf', ''));
    } else {
      setError('Please drop a PDF file');
    }
  }

  function handleFileChange(e) {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (!title) setTitle(selected.name.replace('.pdf', ''));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setError('');

    try {
      // Create the deck first
      const deck = await deckService.create({ title: title.trim(), description: description.trim() });

      if (file) {
        // Phase 1: Extract text from PDF
        setStep('uploading');
        setProgress({ phase: 'Extracting text from PDF...', percent: 0, detail: '' });

        const { chunks, pageCount } = await extractTextFromPDF(file, (p) => {
          setProgress(prev => ({ ...prev, percent: p, detail: `${p}% — Processing pages` }));
        });

        if (chunks.length === 0) {
          setError('Could not extract text from this PDF. Please try a text-based PDF.');
          setStep('form');
          return;
        }

        setProgress({
          phase: 'Text extracted!',
          percent: 100,
          detail: `${pageCount} pages → ${chunks.length} sections`,
        });

        // Phase 2: Generate cards with AI
        setStep('generating');
        setProgress({ phase: 'Generating flashcards with AI...', percent: 0, detail: '' });

        const cards = await generateCardsFromChunks(chunks, (completed, total, allCards) => {
          const pct = Math.round((completed / total) * 100);
          setProgress({
            phase: 'Generating flashcards with AI...',
            percent: pct,
            detail: `Section ${completed}/${total} — ${allCards.length} cards generated`,
          });
        });

        if (cards.length > 0) {
          // Save cards to database
          setProgress({ phase: 'Saving cards...', percent: 95, detail: `${cards.length} cards` });

          const cardsToInsert = cards.map(card => ({
            deck_id: deck.id,
            front: card.front,
            back: card.back,
            card_type: card.card_type,
            tags: card.tags,
            difficulty_hint: card.difficulty_hint,
          }));

          await cardService.createMany(cardsToInsert);
          await deckService.updateCardCount(deck.id);

          setProgress({ phase: 'Done!', percent: 100, detail: `${cards.length} flashcards created` });
        }
      }

      setStep('done');

      // Navigate to the new deck after a brief moment
      setTimeout(() => {
        onCreated(deck);
        navigate(`/deck/${deck.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating deck:', err);
      setError(err.message || 'Failed to create deck. Please try again.');
      setStep('form');
    }
  }

  // --- Render by step ---
  if (step === 'uploading' || step === 'generating') {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && null}>
        <div className="modal" style={{ textAlign: 'center' }}>
          <div className="generation-progress">
            <div className="spinner spinner-lg" style={{ margin: '0 auto var(--space-6)' }} />
            <h3 className="heading-4">{progress.phase}</h3>

            {/* Progress bar */}
            <div style={{
              width: '100%', height: 6, background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-full)', marginTop: 'var(--space-4)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${progress.percent}%`, height: '100%',
                background: 'linear-gradient(90deg, var(--primary-500), var(--primary-400))',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.3s ease',
              }} />
            </div>

            <p style={{
              fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
              marginTop: 'var(--space-3)',
            }}>
              {progress.detail}
            </p>

            {step === 'generating' && (
              <p style={{
                fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
                marginTop: 'var(--space-4)',
              }}>
                This may take a minute depending on the PDF size...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>✅</div>
          <h3 className="heading-4">Deck Created!</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
            {progress.detail}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal animate-scaleIn">
        <div className="modal-header">
          <h2 className="modal-title">Create New Deck</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--error-500)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 'var(--text-sm)',
            marginBottom: 'var(--space-4)',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div className="input-group">
              <label className="input-label" htmlFor="deck-title">Deck Title *</label>
              <input
                id="deck-title"
                className="input"
                type="text"
                placeholder="e.g., Biology Chapter 5"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="deck-desc">Description (optional)</label>
              <input
                id="deck-desc"
                className="input"
                type="text"
                placeholder="Brief description of this deck"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* PDF Upload Dropzone */}
            <div>
              <label className="input-label" style={{ marginBottom: 'var(--space-2)', display: 'block' }}>
                Upload PDF (optional)
              </label>
              <div
                className={`dropzone ${isDragOver ? 'active' : ''}`}
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{ padding: 'var(--space-8) var(--space-6)' }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                {file ? (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📄</div>
                    <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      style={{
                        marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)',
                        color: 'var(--error-500)', background: 'none', border: 'none', cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="dropzone-icon">📎</div>
                    <p className="dropzone-text">Drop a PDF here or click to browse</p>
                    <p className="dropzone-hint">AI will generate flashcards from your document</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {file ? '🤖 Create & Generate Cards' : 'Create Empty Deck'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
