# LLM2Word

Convert Markdown + LaTeX equations from ChatGPT, Claude, Gemini, and other LLMs into Word-compatible formatting, ready to be pasted straight into MS Word.

## How to use

Ever struggled with formatting issues when copying content from an LLM straight into MS Word? No problem! Just go to [this website](https://nathhenry3.github.io/LLM2Word/) and follow the steps below:

1. Copy content from an LLM
2. Paste it into the editor
3. The preview updates automatically
4. Click **Copy converted content**
5. Paste directly into Microsoft Word

If equations paste incorrectly, ask the LLM to output the content as raw LaTeX first, then paste it here. Works best if you click the 'Copy content' button below the LLM response. 

---

## Supported content

* Markdown formatting
* Inline equations
* Display equations
* Headings
* Bullet points
* Numbered lists
* Code blocks
* Markdown tables
* CSV tables

Example inline equation:

```latex id="f0d53o"
$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$
```

Example display equation:

```latex id="2yhs1w"
$$
\int_{-\infty}^{\infty} e^{-x^2}dx = \sqrt{\pi}
$$
```

---

## Notes

* Works best in modern browsers
* Clipboard access requires HTTPS
* Everything runs locally in your browser
* No data is uploaded or stored
