const fs = require('node:fs/promises');
const pdfParse = require('pdf-parse');

async function parseResume(filePath) {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    
    // Clean up parsed text
    let text = data.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Optionally truncate to avoid massive context window overload (e.g., max 3000 chars)
    if (text.length > 3000) {
      text = text.substring(0, 3000) + '... [TRUNCATED]';
    }
    
    return text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse resume PDF.');
  }
}

module.exports = { parseResume };
