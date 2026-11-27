import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestEmailFix } from './emailTypo';

test('fixes typos seen in real sign-ups', () => {
  assert.equal(suggestEmailFix('anna@icloud.con'), 'anna@icloud.com');
  assert.equal(suggestEmailFix('anna@ivloud.com'), 'anna@icloud.com');
  assert.equal(suggestEmailFix('Anna@GMAIL.CON'), 'anna@gmail.com');
  assert.equal(suggestEmailFix('anna@gmial.com'), 'anna@gmail.com');
  assert.equal(suggestEmailFix('anna@gmail.co'), 'anna@gmail.com');
  assert.equal(suggestEmailFix('anna@mweb.co.z'), 'anna@mweb.co.za');
});

test('leaves correct and unknown domains alone', () => {
  assert.equal(suggestEmailFix('anna@gmail.com'), null);
  assert.equal(suggestEmailFix('anna@taxattorneys.co.za'), null);
  assert.equal(suggestEmailFix('anna@africannomad.co.za'), null);
  assert.equal(suggestEmailFix('anna@'), null);
  assert.equal(suggestEmailFix('not-an-email'), null);
});
