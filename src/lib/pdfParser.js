import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set the worker source to use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extract text from a PDF file, preserving structure.
 *
 * @param {File} file - The PDF file to parse
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<{text: string, chunks: string[], pageCount: number}>}
 */
export async function extractTextFromPDF(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  let fullText = '';
  const pageTexts = [];

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    let pageText = '';
    let lastY = null;
    let lastFontSize = null;

    for (const item of content.items) {
      if (!item.str) continue;

      const fontSize = item.transform ? Math.abs(item.transform[3]) : 12;
      const y = item.transform ? item.transform[5] : 0;

      // Detect line breaks based on Y position change
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        pageText += '\n';

        // Detect headings (larger font size = likely heading)
        if (fontSize > (lastFontSize || 12) * 1.2) {
          pageText += '\n## ';
        }
      }

      pageText += item.str;
      lastY = y;
      lastFontSize = fontSize;
    }

    pageTexts.push(pageText.trim());
    fullText += pageText + '\n\n---PAGE BREAK---\n\n';

    if (onProgress) {
      onProgress(Math.round((i / pageCount) * 100));
    }
  }

  // Chunk the text into meaningful sections
  const chunks = chunkText(fullText);

  return {
    text: fullText,
    chunks,
    pageCount,
  };
}

/**
 * Split text into meaningful chunks for AI processing.
 * Target: ~500-800 words per chunk, splitting on heading/paragraph boundaries.
 */
function chunkText(text) {
  // Remove page break markers
  const cleanText = text.replace(/---PAGE BREAK---/g, '').trim();

  if (!cleanText) return [];

  // Try to split on headings first
  const sections = cleanText.split(/\n(?=## )/);

  const chunks = [];
  let currentChunk = '';

  for (const section of sections) {
    const wordCount = countWords(currentChunk + section);

    if (wordCount > 800 && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = section;
    } else if (wordCount > 1200) {
      // Section itself is too long, split by paragraphs
      if (currentChunk) chunks.push(currentChunk.trim());

      const paragraphs = section.split(/\n\n+/);
      currentChunk = '';

      for (const para of paragraphs) {
        if (countWords(currentChunk + para) > 800 && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = para;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + section;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Filter out very small chunks (less than 30 words)
  return chunks.filter(chunk => countWords(chunk) >= 30);
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
