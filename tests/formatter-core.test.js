const assert = require('node:assert/strict');
const { loadFormatter } = require('./formatter-test-utils');

const { context } = loadFormatter();
const {
  escapeHtml,
  sanitizeRenderedHtml,
  splitMarkdownRow,
  isMarkdownSeparator,
  normalizeRow,
  splitCsvRow,
  looksLikeDataValue,
  looksLikeHeaderLabel,
  hasClearlyLabeledFirstRow,
  buildWordTableHtml,
  createPlaceholder,
  replacePlaceholders,
  looksLikeParentheticalMath,
  replaceParentheticalMath,
  protectMath,
  restoreMath,
  renderMathInPlainText,
  isMarkdownFenceLine,
  isSoftLineParagraphCandidate,
  preserveSingleNewlineParagraphs
} = context;

assert.equal(escapeHtml(`<tag attr="x">Tom & Jerry's</tag>`), '&lt;tag attr=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/tag&gt;');

assert.equal(
  sanitizeRenderedHtml('<p onclick="alert(1)"><a href="javascript:alert(1)">bad</a><img src="javascript:bad"><script>alert(1)</script>ok</p>'),
  '<p><a>bad</a><img>ok</p>',
  'sanitizer should remove script tags and javascript/event attributes'
);

assert.deepEqual([...splitMarkdownRow('| Name | Formula | Escaped \\| pipe |')], ['Name', 'Formula', 'Escaped | pipe']);
assert.equal(isMarkdownSeparator('| :--- | ---: |'), true);
assert.equal(isMarkdownSeparator('| not | separator |'), false);
assert.deepEqual([...normalizeRow(['a'], 3)], ['a', '', '']);
assert.deepEqual([...normalizeRow(['a', 'b', 'c'], 2)], ['a', 'b']);

assert.deepEqual([...splitCsvRow('Alpha,"Baseline, with comma","He said ""hi""",TRUE').cells], ['Alpha', 'Baseline, with comma', 'He said "hi"', 'TRUE']);
assert.equal(splitCsvRow('Alpha,"unterminated').isComplete, false);
assert.equal(looksLikeDataValue('$1,200.50'), true);
assert.equal(looksLikeDataValue('https://example.com'), true);
assert.equal(looksLikeDataValue('plain label'), false);
assert.equal(looksLikeHeaderLabel('Scenario'), true);
assert.equal(looksLikeHeaderLabel('98.5%'), false);
assert.equal(hasClearlyLabeledFirstRow([
  ['Name', 'Rate'],
  ['Alpha', '98.5%']
]), true);
assert.equal(hasClearlyLabeledFirstRow([
  ['Name', 'Name'],
  ['Alpha', 'Beta']
]), false);

const tableHtml = buildWordTableHtml([{
  headers: ['Name', 'Value'],
  rows: [['Alpha', '<unsafe>']],
  hasHeaderRow: true
}]);
assert.match(tableHtml, /<table border="1"/);
assert.match(tableHtml, /font-weight: bold/);
assert.match(tableHtml, /&lt;unsafe&gt;/);

assert.equal(createPlaceholder('TABLE', 2), '@@LLM2WORD_TABLE_2@@');
assert.equal(replacePlaceholders('<p>@@LLM2WORD_TABLE_0@@</p>', ['<table></table>']), '<table></table>');
assert.equal(replacePlaceholders('<div>@@LLM2WORD_TABLE_0@@</div>', ['<table></table>']), '<div><table></table></div>');

assert.equal(looksLikeParentheticalMath('f(t)'), true);
assert.equal(looksLikeParentheticalMath('replace this sample with your own content'), false);
assert.equal(looksLikeParentheticalMath('https://example.com'), false);

const parentheticalOutput = replaceParentheticalMath('Use (f(t)) but keep (normal text).', (tex, display) => `[${display}:${tex}]`);
assert.equal(parentheticalOutput, 'Use [false:f(t)] but keep (normal text).');

const protectedMath = protectMath('Inline $x+1$ and display $$y=2$$ plus \\(z\\) and (p_i).', 'TEST_MATH');
assert.equal(protectedMath.placeholders.length, 4);
assert.match(protectedMath.raw, /@@LLM2WORD_TEST_MATH_0@@/);
assert.match(restoreMath(protectedMath.raw, protectedMath.placeholders), /<math data-display="false">x\+1<\/math>/);
assert.match(restoreMath(protectedMath.raw, protectedMath.placeholders), /<math data-display="true">y=2<\/math>/);
assert.match(renderMathInPlainText('Cell $a < b$'), /<math data-display="false">a &lt; b<\/math>/);

assert.equal(isMarkdownFenceLine('```js'), true);
assert.equal(isMarkdownFenceLine('~~~'), true);
assert.equal(isMarkdownFenceLine('not a fence'), false);
assert.equal(isSoftLineParagraphCandidate('Plain prose.'), true);
assert.equal(isSoftLineParagraphCandidate('- list item'), false);
assert.equal(isSoftLineParagraphCandidate('@@LLM2WORD_MARKDOWN_MATH_0@@'), true);
assert.equal(
  preserveSingleNewlineParagraphs('Sentence one.\nSentence two.'),
  'Sentence one.\n\nSentence two.'
);
assert.equal(
  preserveSingleNewlineParagraphs('```\nSentence one.\nSentence two.\n```'),
  '```\nSentence one.\nSentence two.\n```'
);

console.log('formatter core tests passed');
