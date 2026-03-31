# Calculator Website

An offline-friendly scientific calculator built with vanilla **HTML/CSS/JavaScript**. It lets you type or click an expression, previews the result as you go, and evaluates expressions using a small parser (no `eval()`).

## Features

- **Live preview** while typing/clicking
- **Keyboard shortcuts**
  - `Enter` = equals
  - `Esc` = clear
  - `Backspace` = delete last character
- **Operators**: `+` `-` `*` `/` `%` `^` `!` (factorial)
- **Functions**: `sin` `cos` `tan` `sqrt` `log` `ln` `abs` `round` `floor` `ceil`
- **Constants**: `pi` `e`
- **Trig uses degrees** (e.g. `sin(30)` = `0.5`)

## How to run

### Option A: open directly

Just open `index.html` in your browser.

### Option B (recommended): run a local server

Running a local server avoids any browser quirks around `file://` URLs.

**Python (built-in):**

```bash
python -m http.server 5173
```

Then open:

- http://localhost:5173

## Supported expression syntax

Examples you can try:

- `sin(30) + 2^3`
- `sqrt(9) + 5!`
- `log(1000) - ln(e)`
- `abs(-12) / 4`

Notes:

- `^` is **right-associative** (`2^3^2` is `2^(3^2)`).
- Factorial `!` only supports **non-negative integers** and is limited to `170!`.
- Errors (like mismatched parentheses or division by zero) show in the UI.

## Project structure

- `index.html` — UI layout (display + keypad) and accessibility attributes
- `styles.css` — responsive styling (grid keypad)
- `app.js` — tokenizer + shunting-yard (RPN) evaluation + UI event handling

## Deployment (GitHub Pages)

This repo includes a GitHub Actions workflow that deploys the static site to **GitHub Pages** on pushes to the `main` branch:

- `.github/workflows/static.yml`

To use it:

1. In your GitHub repo: **Settings → Pages**
2. Set **Build and deployment** to **GitHub Actions**
3. Push to `main` and the workflow will publish the site

## License

No license file is included. If you plan to share or reuse this project, consider adding a license (MIT, Apache-2.0, etc.).
