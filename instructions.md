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
10. Click the "Export Table as JPEG" button to download the table as a JPEG image.
11. To test drag-and-drop, drag the same `.yaml` files onto the upload area.
12. If nothing loads, open the browser DevTools console and check for parser or network errors.

Notes:

- Use actual SciolyFF files, not renamed random YAML.
- Keep the local server running while you test.
- Keep the Sass watcher running if you are editing `styles.scss`.
- If you edit the page, hard refresh the browser so it reloads the updated module.

# Publishing on GitHub Pages

To publish this website so others can access it:

1. **Push your code to a public GitHub repository.**
   - Example: `https://github.com/yourusername/scioly-timeline`

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub.
   - Click **Settings** → **Pages** in the left sidebar.
   - Under "Build and deployment", set **Source** to `Deploy from a branch`.
   - Select the branch (usually `main` or `master`) and the root (`/`) folder.
   - Click **Save**.

3. **Wait for deployment.**
   - GitHub will build and deploy your site. The URL will be shown at the top of the Pages settings (e.g., `https://yourusername.github.io/scioly-timeline/`).

4. **Make sure your site is accessible:**
   - Visit the URL shown in the Pages settings.
   - If you see your app, it is public and accessible to anyone with the link.

**Additional Notes:**
- Make sure your `index.html` and all assets (`app.js`, `styles.css`, etc.) are in the repository root (or the folder you selected for Pages).
- If you use custom domains, configure them in the Pages settings.
- If you use CDN imports (like esm.sh), no extra configuration is needed.
- If you use client-side routing, you may need a `404.html` that redirects to `index.html`.
- For best results, always build your CSS (`npm run build:css`) before pushing.
- It may take a few minutes for changes to appear after pushing.
- If you see a 404 or blank page, check that your files are in the correct branch/folder and that the build completed.