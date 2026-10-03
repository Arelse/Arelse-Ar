# AR Drawing Studio

A minimal augmented-reality drawing studio for the browser. Draw freehand over your live camera feed, with an optional reference image and grid guide underneath the controls.

## Features
- Live rear-camera overlay (requires HTTPS or localhost)
- Pen and eraser with burgundy, dark wine and white swatches
- Brush size control and undo history
- Reference image overlay and toggleable grid guide

## Run locally
Open `index.html` through a local server, since camera access needs a secure context:

    npx serve .

## Deploy to GitHub Pages
1. Push this folder to a GitHub repository.
2. Go to Settings > Pages, choose the `main` branch and root folder.
3. Open the published HTTPS URL on your phone.

## Roadmap
- Separate tools, guides and reference modules
- Reference opacity slider
- Real SVG icon set and self-hosted fonts
- Save drawings as PNG

## License
MIT
