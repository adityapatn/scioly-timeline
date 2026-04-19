# Local Testing Instructions

1. Open a terminal in `/Users/aditya/Documents/_Personal/Programming/scioly-timeline`.
2. Install the CSS build dependency:
   ```bash
   npm install
   ```
3. Build `styles.css` from `styles.scss`:
   ```bash
   npm run build:css
   ```
4. (Optional while editing styles) run the Sass watcher in a second terminal:
   ```bash
   npm run watch:css
   ```
5. Start a local web server so the browser can load the module script and CDN imports cleanly:
   ```bash
   python3 -m http.server 8000
   ```
6. Open `http://localhost:8000` in your browser.
7. Click the upload area and choose one or more SciolyFF `.yaml` files.
8. Confirm that each file appears as its own tournament table with 20 rows.
9. Use the checkboxes to toggle the extra information shown in the table.
10. To test drag-and-drop, drag the same `.yaml` files onto the upload area.
11. If nothing loads, open the browser DevTools console and check for parser or network errors.

Notes:

- Use actual SciolyFF files, not renamed random YAML.
- Keep the local server running while you test.
- Keep the Sass watcher running if you are editing `styles.scss`.
- If you edit the page, hard refresh the browser so it reloads the updated module.