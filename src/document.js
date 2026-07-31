const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const MAX_CHUNK_CHARS = 800;

async function extractParagraphs(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let rawText;

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    rawText = data.text;
  } else if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ path: filePath });
    rawText = value;
  } else {
    throw new Error('Unsupported file type. Please choose a .pdf or .docx file.');
  }

  return splitIntoParagraphs(rawText);
}

function splitIntoParagraphs(text) {
  const normalized = String(text || '').replace(/\r\n/g, '\n');

  const blankLineBlocks = normalized
    .split(/\n\s*\n/)
    .map((b) => b.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  // Real paragraph breaks (blank lines) were found — trust them. PDFs often
  // don't have these (pdf.js emits one newline per wrapped visual line, not
  // per paragraph), so in that case treat the whole thing as one continuous
  // block and let sentence-based chunking below produce natural-sized
  // chunks, instead of one chunk per arbitrarily wrapped line.
  const blocks = blankLineBlocks.length > 1
    ? blankLineBlocks
    : [normalized.replace(/\s+/g, ' ').trim()].filter(Boolean);

  const chunks = [];
  for (const block of blocks) {
    chunks.push(...chunkBySentence(block));
  }
  return chunks;
}

// Keeps each spoken chunk to a reasonable length by grouping whole sentences
// rather than cutting mid-sentence.
function chunkBySentence(block) {
  if (block.length <= MAX_CHUNK_CHARS) return [block];

  const sentences = block.split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (current && (current.length + sentence.length + 1) > MAX_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

module.exports = { extractParagraphs, splitIntoParagraphs };
