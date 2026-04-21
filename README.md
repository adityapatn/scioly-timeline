# Science Olympiad Timeline

[Visit the website!](https://adityapatn.github.io/scioly-timeline/)

## Overview

This website allows users to upload multiple SciolyFF YAML files (Science Olympiad tournament results) and generates a combined, interactive table for comparison and analysis.

## Features

- **Multi-tournament Upload:** Upload several SciolyFF YAML files at once.
- **Dynamic Table Rendering:** View all tournaments side-by-side in a single, scrollable table.
- **Medal Counts:** Optionally display per-team medal counts for each tournament.
- **Customizable Columns:** Toggle columns for city, state, team number, suffix, medal counts, and more.
- **Highlighting:** Highlight top teams and customize how many are shown.
- **Export Options:** Copy the table as a PNG image or download as PNG/SVG for sharing or presentations.
- **File Management:** See a list of uploaded files and add and remove as needed.

## Usage

1. Go to the [live site](https://adityavs1.github.io/scioly-timeline/).
2. Drag and drop or select one or more SciolyFF YAML files.
3. Use the controls to customize the table view.
4. Export or download the table as needed.

## Technology

- Pure browser JavaScript (no build required for main app)
- SCSS for styling (compiled to CSS)
- [sciolyff](https://github.com/cxong/sciolyff) for parsing YAML
- [html2canvas](https://html2canvas.hertzen.com/) for image export

## License

MIT License. See LICENSE for details.
