'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mockPlan } = require('../src/agent');

test('mission with no catalog fit is declined, not force-matched', () => {
  const plan = mockPlan('Buy me a house');
  assert.equal(plan.noMatch, true);
  assert.equal(plan.pick, null);
  assert.equal(plan.options.length, 0);
});

test('food mission picks a food voucher (English)', () => {
  const plan = mockPlan('Buy me lunch and something to drink');
  assert.equal(plan.noMatch, undefined);
  assert.equal(plan.pick.category, 'food');
});

test('food mission picks a food voucher (Indonesian)', () => {
  const plan = mockPlan('beli makanan dan minuman online');
  assert.equal(plan.pick.category, 'food');
});

test('everyday missions pick their categories', () => {
  assert.equal(mockPlan('beli token listrik sebelum habis').pick.category, 'bills');
  assert.equal(mockPlan('book a ride across town').pick.category, 'transport');
  assert.equal(mockPlan('buy me vitamins, I feel a flu coming').pick.category, 'health');
  assert.equal(mockPlan('laundry voucher please, mine is piling up').pick.category, 'home');
});

test('buying a house is still declined (a house is not home services)', () => {
  assert.equal(mockPlan('beli rumah untuk keluarga').noMatch, true);
});

test('domain mission still picks a domain', () => {
  const plan = mockPlan('Buy me a cheap domain for my bakery');
  assert.equal(plan.pick.category, 'domains');
});

test('game mission still picks a game voucher', () => {
  const plan = mockPlan('Get me a game voucher, I had a long week');
  assert.equal(plan.pick.category, 'games');
});
