import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Phase 1 - Shell, Private Navigation & Visual Tokens V4.1', () => {
  const stylesCssPath = path.resolve(__dirname, 'styles.css');
  const appTsxPath = path.resolve(__dirname, 'App.tsx');
  const navCssPath = path.resolve(__dirname, 'navigation-v2.css');

  it('defines mandatory V4.1 Campo Claro design tokens in styles.css', () => {
    const content = fs.readFileSync(stylesCssPath, 'utf-8');
    assert.match(content, /--verde-magina:\s*#203D2A/i);
    assert.match(content, /--piedra:\s*#F6F3E8/i);
    assert.match(content, /--tinta:\s*#1A221C/i);
    assert.match(content, /--verde-hoja:\s*#4E6A55/i);
    assert.match(content, /--aceite:\s*#B8892D/i);
    assert.match(content, /--rojo-tierra:\s*#9A3D2F/i);
    assert.match(content, /--superficie:\s*#FFFFFF/i);
    assert.match(content, /--verde-palido:\s*#DDE6DD/i);
  });

  it('enforces mandatory 5-item bottom navigation shell in App.tsx', () => {
    const content = fs.readFileSync(appTsxPath, 'utf-8');
    
    // Must contain exact 5 nav items: Inicio, Mi Campo, +, Campaña, Más
    assert.ok(content.includes('label="Inicio"'));
    assert.ok(content.includes('label="Mi Campo"'));
    assert.ok(content.includes('aria-label="Centro de acciones"'));
    assert.ok(content.includes('label="Campaña"'));
    assert.ok(content.includes('label="Más"'));
  });

  it('styles the Action Center overlay in navigation-v2.css', () => {
    const content = fs.readFileSync(navCssPath, 'utf-8');
    assert.ok(content.includes('.action-center-overlay'));
    assert.ok(content.includes('.action-center-sheet'));
    assert.ok(content.includes('.action-center-grid'));
    assert.ok(content.includes('.action-center-item'));
  });
});
