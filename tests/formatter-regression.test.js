const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const helperBlock = indexHtml.match(/function isMarkdownFenceLine[\s\S]+?function renderMarkdownWithMath/);
assert(helperBlock, 'Expected formatter paragraph helpers to be present in index.html');

eval(helperBlock[0].replace(/function renderMarkdownWithMath$/, ''));

assert.equal(
  preserveSingleNewlineParagraphs('Here is Sentence 1 and it goes on and on.\nHere is Sentence 2 and it also goes on.'),
  'Here is Sentence 1 and it goes on and on.\n\nHere is Sentence 2 and it also goes on.',
  'plain single-newline prose should become separate Markdown paragraphs'
);

assert.equal(
  preserveSingleNewlineParagraphs('Intro\n@@LLM2WORD_MARKDOWN_MATH_0@@\nOutro'),
  'Intro\n\n@@LLM2WORD_MARKDOWN_MATH_0@@\n\nOutro',
  'standalone protected math should keep paragraph boundaries around adjacent prose'
);

assert.equal(
  preserveSingleNewlineParagraphs('- first\n- second\n  continued'),
  '- first\n- second\n  continued',
  'lists and list continuations should not be split into unrelated paragraphs'
);

assert.equal(
  preserveSingleNewlineParagraphs('```\nline one\nline two\n```'),
  '```\nline one\nline two\n```',
  'backtick fenced code blocks should not be changed'
);

assert.equal(
  preserveSingleNewlineParagraphs('~~~\nline one\nline two\n~~~'),
  '~~~\nline one\nline two\n~~~',
  'tilde fenced code blocks should not be changed'
);

assert.equal(
  preserveSingleNewlineParagraphs('Heading\n---\nNext paragraph'),
  'Heading\n---\nNext paragraph',
  'setext headings and horizontal rules should not be split'
);

console.log('formatter regression tests passed');
