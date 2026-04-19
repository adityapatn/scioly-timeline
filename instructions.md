# Local Testing Instructions

1. Open a terminal in `/Users/aditya/Documents/_Personal/Programming/scioly-timeline`.
2. Start a local web server so the browser can load the module script and CDN imports cleanly:
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.
4. Click the upload area and choose one or more SciolyFF `.yaml` files.
5. Confirm that each file appears as its own tournament table with 20 rows.
6. Use the checkboxes to toggle the extra information shown in the table.
7. To test drag-and-drop, drag the same `.yaml` files onto the upload area.
8. If nothing loads, open the browser DevTools console and check for parser or network errors.

Notes:

- Use actual SciolyFF files, not renamed random YAML.
- Keep the local server running while you test.
- If you edit the page, hard refresh the browser so it reloads the updated module.