import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Mi Olivo Gamification Convergence V1', () => {
  const appTsxPath = path.resolve(__dirname, 'App.tsx');
  const loyaltyPagePath = path.resolve(__dirname, 'LoyaltyOlivePage.tsx');

  it('includes Mi Olivo tab in App.tsx navigation shell', () => {
    const content = fs.readFileSync(appTsxPath, 'utf-8');
    assert.ok(content.includes("label=\"Mi Olivo\""));
    assert.ok(content.includes("<LoyaltyOlivePage />"));
    assert.ok(content.includes("type Tab = 'home' | 'field' | 'campaign' | 'magina' | 'loyalty' | 'more'"));
  });

  it('renders Tu Olivo progress card in HomeTab', () => {
    const content = fs.readFileSync(appTsxPath, 'utf-8');
    assert.ok(content.includes('Tu Olivo'));
    assert.ok(content.includes("onNavigate('loyalty')"));
  });

  it('provides 4 sub-sections (Olivo, Misiones, Recompensas, Logros) in LoyaltyOlivePage.tsx', () => {
    const content = fs.readFileSync(loyaltyPagePath, 'utf-8');
    assert.ok(content.includes("setSubTab('olivo')"));
    assert.ok(content.includes("setSubTab('misiones')"));
    assert.ok(content.includes("setSubTab('recompensas')"));
    assert.ok(content.includes("setSubTab('logros')"));
  });
});
