const assert = require('node:assert/strict');
const { loadFormatter } = require('./formatter-test-utils');

const { context, elements } = loadFormatter();
const {
  createFormatterTablePlaceholder,
  replaceMarkdownTablesForFormatter,
  replaceCsvTablesForFormatter,
  isLikelyCsvTable,
  renderMarkdownWithMath,
  renderFormatterPreview,
  copyHtml,
  getSavedTheme,
  saveTheme,
  getActiveTheme,
  updateThemeToggle,
  setTheme
} = context;

let tablePlaceholders = [];
const markdownTableResult = replaceMarkdownTablesForFormatter([
  'Before',
  '',
  '| Name | Formula | Notes |',
  '| --- | --- | --- |',
  '| Alpha | $x+1$ | Escaped \\| pipe |',
  '| Short | only two cells |',
  '',
  'After'
].join('\n'), tablePlaceholders);
assert.equal(tablePlaceholders.length, 1, 'markdown table should be replaced by one table placeholder');
assert.match(markdownTableResult, /@@LLM2WORD_TABLE_0@@/);
assert.doesNotMatch(markdownTableResult, /\| --- \|/);
assert.match(tablePlaceholders[0], /<table border="1"/);
assert.match(tablePlaceholders[0], /<math data-display="false">x\+1<\/math>/);
assert.match(tablePlaceholders[0], /Escaped \| pipe/);
assert.match(tablePlaceholders[0], /<td[^>]*><\/td>/, 'short markdown rows should be padded with empty cells');

const fencedMarkdown = '```\n| Not | Table |\n| --- | --- |\n| 1 | 2 |\n```';
tablePlaceholders = [];
assert.equal(replaceMarkdownTablesForFormatter(fencedMarkdown, tablePlaceholders), fencedMarkdown);
assert.equal(tablePlaceholders.length, 0, 'markdown tables inside fences should not be converted');

assert.equal(isLikelyCsvTable([
  ['Dataset', 'Rate', 'Link'],
  ['Alpha', '98.5%', 'https://example.com']
]), true);
assert.equal(isLikelyCsvTable([
  ['Here is sentence one.', 'Here is sentence two.'],
  ['Another sentence.', 'More prose.']
]), false);

tablePlaceholders = [];
const csvInput = [
  'Dataset,Scenario,Complete,Rate,Cost,Formula,Link',
  'Alpha,"Baseline, no intervention",TRUE,98.5%,"$1,200.00",$\\mu = 4.2$,https://example.com/alpha',
  'Beta,"Treatment with ""quoted"" note",FALSE,91.2%,$980.75,$\\sigma^2 = 1.8$,https://example.com/beta'
].join('\n');
const csvResult = replaceCsvTablesForFormatter(csvInput, tablePlaceholders);
assert.equal(tablePlaceholders.length, 1, 'CSV table should be replaced by one table placeholder');
assert.match(csvResult, /@@LLM2WORD_TABLE_0@@/);
assert.match(tablePlaceholders[0], /Baseline, no intervention/);
assert.match(tablePlaceholders[0], /Treatment with &quot;quoted&quot; note/);
assert.match(tablePlaceholders[0], /<math data-display="false">\\mu = 4\.2<\/math>/);

const fencedCsv = '~~~\nName,Rate\nAlpha,98%\n~~~';
tablePlaceholders = [];
assert.equal(replaceCsvTablesForFormatter(fencedCsv, tablePlaceholders), fencedCsv);
assert.equal(tablePlaceholders.length, 0, 'CSV tables inside fences should not be converted');

const renderedMath = renderMarkdownWithMath('Sentence one.\nSentence two with $x+1$.\n\n$$y=2$$');
assert.equal(renderedMath.equationCount, 2);
assert.match(renderedMath.html, /<p>Sentence one\.<\/p>\n<p>Sentence two with <math data-display="false">x\+1<\/math>\.<\/p>/);
assert.match(renderedMath.html, /<p><math data-display="true">y=2<\/math><\/p>/);

elements.formatterInput.value = '';
let payload = renderFormatterPreview();
assert.equal(payload.tableCount, 0);
assert.equal(payload.equationCount, 0);
assert.equal(elements.copyFormatterBtn.disabled, true);
assert.match(elements.formatterPreview.innerHTML, /No content yet/);
assert.equal(elements.formatterStatus.textContent, 'Waiting for content.');

elements.formatterInput.value = [
  'Here is Sentence 1 and it goes on and on.',
  'Here is Sentence 2 and it also goes on.',
  '',
  '| Name | Score |',
  '| --- | ---: |',
  '| Alpha | 10 |',
  '',
  'Inline $z+1$.'
].join('\n');
payload = renderFormatterPreview();
assert.equal(payload.tableCount, 1);
assert.equal(payload.equationCount, 1);
assert.equal(elements.copyFormatterBtn.disabled, false);
assert.match(elements.formatterPreview.innerHTML, /<p>Here is Sentence 1 and it goes on and on\.<\/p>\n<p>Here is Sentence 2 and it also goes on\.<\/p>/);
assert.match(elements.formatterPreview.innerHTML, /<table border="1"/);
assert.match(elements.formatterStatus.textContent, /1 equation and 1 optimized table/);

saveTheme('dark');
assert.equal(getSavedTheme(), 'dark');
assert.equal(getActiveTheme(), 'dark');
updateThemeToggle();
assert.equal(elements.themeToggle.textContent, '☀️ Light mode');
assert.equal(elements.themeToggle['aria-pressed'], 'true');
setTheme('light');
assert.equal(context.document.documentElement.dataset.theme, 'light');
assert.equal(getActiveTheme(), 'light');
assert.equal(elements.themeToggle.textContent, '🌙 Dark mode');

(async () => {
  elements.formatterPreview.innerText = 'Plain text copy';
  const copied = await copyHtml('<p>HTML copy</p>', elements.formatterPreview, elements.formatterStatus);
  assert.equal(copied, true);
  assert.equal(context.navigator.clipboard.writes.length, 1);
  console.log('formatter rendering tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
