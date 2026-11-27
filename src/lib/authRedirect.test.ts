import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeRedirect } from './authRedirect';

const O = 'https://blom-cosmetics.co.za';

test('keeps same-site paths', () => {
  assert.equal(safeRedirect('/account', '/x', O), '/account');
  assert.equal(safeRedirect('/checkout?step=2#pay', '/x', O), '/checkout?step=2#pay');
  assert.equal(safeRedirect('/account/reset-password?next=%2Faccount', '/x', O), '/account/reset-password?next=%2Faccount');
});

test('blocks off-site destinations', () => {
  for (const bad of ['//evil.com', '/\\evil.com', '/\\/evil.com', '/\t/evil.com', 'https://evil.com', 'javascript:alert(1)', '', null, undefined]) {
    assert.equal(safeRedirect(bad as string, '/account', O), '/account', String(bad));
  }
});
