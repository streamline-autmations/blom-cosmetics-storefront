import assert from 'node:assert/strict';
import test from 'node:test';
import {
  categorizeProduct,
  categoryPath,
  primaryCategoryPath,
  productCode,
  productMatchesSearch,
  toCategorySlug,
} from './shopCategories';

const has = (name: string, raw: string[], ...slugs: string[]) => {
  const cats = categorizeProduct(name, raw);
  slugs.forEach((slug) => assert.ok(cats.includes(slug), `${name} should be in ${slug}; got ${cats.join(', ')}`));
  return cats;
};
const lacks = (cats: string[], ...slugs: string[]) =>
  slugs.forEach((slug) => assert.ok(!cats.includes(slug), `unexpected ${slug} in ${cats.join(', ')}`));

test('reads shade codes from real product names', () => {
  assert.deepEqual(productCode('Colour Acrylic - Enchanted (E005)'), { prefix: 'E', number: 5 });
  assert.deepEqual(productCode('Colour Acrylic - Rosé(E003)'), { prefix: 'E', number: 3 });
  assert.deepEqual(productCode('Colour Acrylic-E011'), { prefix: 'E', number: 11 });
  assert.deepEqual(productCode('Gel Polish - (GP0022)'), { prefix: 'GP', number: 22 });
  assert.deepEqual(productCode('Snow Rubber Base  -RB002'), { prefix: 'RB', number: 2 });
  assert.deepEqual(productCode('Rubber Base Gel- RB0010'), { prefix: 'RB', number: 10 });
  assert.deepEqual(productCode('Brown Cat Eye Gel - CE004'), { prefix: 'CE', number: 4 });
  assert.deepEqual(productCode('Core Acrylic - Bella Rose (N002)'), { prefix: 'N', number: 2 });
  assert.deepEqual(productCode('Bride to be Nude 56g-(077)'), { prefix: '', number: 77 });
  assert.equal(productCode('Hydra-Nail Cleanser'), null);
});

test('E-code acrylics are exclusive colour acrylics, even when mis-tagged as core', () => {
  const cats = has('Colour Acrylics - Rose Petal Tea (E010)', ['acrylic-system', 'core-acrylics'],
    'exclusive-acrylics', 'coloured-acrylics', 'acrylic-system');
  lacks(cats, 'core-acrylics', 'standard-colour-acrylics');
  has('Colour Acrylic-E011', ['acrylic-system'], 'exclusive-acrylics');
  has('Colour Acrylic - Nude Snowkiss (E002)', ['acrylic-system'], 'exclusive-acrylics');
});

test('glitter, core and standard colour acrylics', () => {
  has('Cheers Babe (G012)', ['acrylic-system', 'coloured-acrylics'], 'glitter-acrylics', 'coloured-acrylics');
  has('Glitter Acrylic - Funfetti (G004)', ['acrylic-system'], 'glitter-acrylics');
  const core = has('Bride to be Nude 56g-(077)', ['acrylic-system'], 'core-acrylics');
  lacks(core, 'coloured-acrylics');
  has('Core Acrylics (N003) Dyns Doll', ['acrylic-system', 'core-acrylics'], 'core-acrylics');
  const std = has('Colour Acrylic - Lipstick (010)', ['acrylic-system'], 'standard-colour-acrylics', 'coloured-acrylics');
  lacks(std, 'exclusive-acrylics', 'glitter-acrylics', 'core-acrylics');
  const custom = has('Created For You – Custom Acrylic', ['acrylic-system', 'custom-acrylic'], 'acrylic-system');
  lacks(custom, 'core-acrylics', 'coloured-acrylics');
});

test('every nail liquid size lands only in Nail Liquids', () => {
  for (const name of ['100ml Nail Liquid', '1l Nail Liquid', '250ml Nail Liquid', '500ml Nail Liquid']) {
    assert.deepEqual(categorizeProduct(name, ['acrylic-system', 'core-acrylics']), ['nail-liquids']);
  }
});

test('gel sub-categories', () => {
  has('Gel Polish - Lady Sage (GP008)', ['gel-system'], 'gel-polishes', 'gel-system');
  has('Petal Rubber Base – RB001', ['gel-system'], 'rubber-base-gels');
  has('Pink Cat Eye Gel - CE001', ['gel-system'], 'cat-eye-gels');
  has('Builder in a Bottle - Crystal Clear', ['gel-system'], 'builder-base-gels');
  has('Non-Wipe Top Coat', ['prep-finishing'], 'prep-finishing', 'builder-base-gels', 'gel-system');
  lacks(categorizeProduct('Polish Garden (Gel Polish Rack)', ['furniture']), 'gel-system');
  lacks(categorizeProduct('Cat Eye Magnet Stick', ['Tools & Essentials']), 'gel-system');
});

test('legacy category labels normalise', () => {
  assert.equal(toCategorySlug('Accessories.'), 'tools-essentials');
  assert.equal(toCategorySlug('tools-accessories'), 'tools-essentials');
  assert.equal(toCategorySlug('Prep & Finish'), 'prep-finishing');
  assert.equal(toCategorySlug('acrylic-systems'), 'acrylic-system');
});

test('breadcrumb path follows the deepest category', () => {
  const cats = categorizeProduct('Colour Acrylic - Enchanted (E005)', ['acrylic-system']);
  assert.deepEqual(primaryCategoryPath(cats).map((c) => c.slug),
    ['acrylic-system', 'coloured-acrylics', 'exclusive-acrylics']);
  assert.deepEqual(categoryPath('gel-polishes').map((c) => c.name), ['Gel', 'Gel Polishes']);
});

test('search is forgiving about accents, order and code zeros', () => {
  const rose = { name: 'Colour Acrylic - Rosé(E003)', sku: 'ACR-175507', categories: ['exclusive-acrylics'] };
  assert.ok(productMatchesSearch(rose, 'rose'));
  assert.ok(productMatchesSearch(rose, 'e3'));
  assert.ok(productMatchesSearch(rose, 'E003'));
  assert.ok(productMatchesSearch(rose, 'exclusive'));
  assert.ok(productMatchesSearch(rose, 'acrylic rose'));
  assert.ok(!productMatchesSearch(rose, 'e30'));
  assert.ok(productMatchesSearch(rose, '003'));
  const catEye = { name: 'Nude Brown Cat Eye Gel - CE005', categories: ['cat-eye-gels'] };
  assert.ok(!productMatchesSearch(catEye, 'e5'));
  assert.ok(!productMatchesSearch(catEye, 'E005'));
  assert.ok(productMatchesSearch(catEye, 'ce5'));
  const polish = { name: 'Gel Polish - Black (GP014)', categories: ['gel-polishes'] };
  assert.ok(productMatchesSearch(polish, 'gp14'));
  assert.ok(productMatchesSearch(polish, 'black polish'));
  assert.ok(!productMatchesSearch(polish, 'white'));
});
