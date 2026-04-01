#!/usr/bin/env node
/**
 * generate-docs.js
 *
 * Exports the OpenAPI 3.0 specification to:
 *   docs/api/swagger.json   – raw spec (for tooling)
 *   docs/api/index.html     – static Redoc single-page HTML (for submission)
 *
 * Run from the api-service root:
 *   node scripts/generate-docs.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const spec     = require('../src/config/swagger');
const repoRoot = path.resolve(__dirname, '..', '..', '..', '..');
const outDir   = path.join(repoRoot, 'docs', 'api');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Write raw spec JSON
const jsonPath = path.join(outDir, 'swagger.json');
fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2), 'utf8');
console.log(`✓ Spec written → ${jsonPath}`);

// 2. Write static Redoc HTML (loads spec from inline JSON via CDN renderer)
const specInline = JSON.stringify(spec);
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Replate AI – API Documentation</title>
  <style>
    body { margin: 0; padding: 0; font-family: sans-serif; }
    #redoc-container { height: 100vh; }
  </style>
</head>
<body>
  <div id="redoc-container"></div>
  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init(${specInline}, {
      scrollYOffset: 50,
      hideDownloadButton: false,
      theme: {
        colors: { primary: { main: '#4CAF50' } },
        typography: { fontSize: '15px', headingsFont: { family: 'sans-serif' } }
      }
    }, document.getElementById('redoc-container'));
  </script>
</body>
</html>`;

const htmlPath = path.join(outDir, 'index.html');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log(`✓ Static HTML written → ${htmlPath}`);
console.log('\nOpen docs/api/index.html in a browser to view the docs.');
