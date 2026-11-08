import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, productionSchema, validateProductionLimits, monthPeriod } from '../lib/domain.ts';
const valid = { profileId: '825f3d80-bdb1-45a8-9914-5788bb9acde3', title: 'Temporada educativa', topic: 'Una temporada sobre el inicio de un negocio', type: 'series', style: '2d', episodes: 10, duration: 90, budgetCents: 1000, requestKey: 'd776d5c8-17cd-433a-b151-ce20013e878f' };
test('series must contain a complete season of 10–25 chapters', () => {
  assert.equal(productionSchema.safeParse(valid).success, true);
  assert.equal(productionSchema.safeParse({ ...valid, episodes: 9 }).success, false);
  assert.equal(productionSchema.safeParse({ ...valid, episodes: 26 }).success, false);
});
test('VSL requires one video between 120 and 300 seconds', () => {
  assert.equal(productionSchema.safeParse({ ...valid, type: 'vsl', episodes: 1, duration: 120 }).success, true);
  assert.equal(productionSchema.safeParse({ ...valid, type: 'vsl', episodes: 1, duration: 90 }).success, false);
  assert.equal(productionSchema.safeParse({ ...valid, type: 'vsl', episodes: 2, duration: 180 }).success, false);
});
test('basic plan rejects unsupported chapter count and duration', () => {
  assert.throws(() => validateProductionLimits({ ...valid, episodes: 25 }, PLANS.basic));
  assert.throws(() => validateProductionLimits({ ...valid, duration: 300 }, PLANS.basic));
  assert.doesNotThrow(() => validateProductionLimits({ ...valid, episodes: 25, duration: 300 }, PLANS.pro));
});
test('unlimited preserves a finite provider budget', () => {
  assert.equal(PLANS.unlimited.monthlyMinutes, null);
  assert.throws(() => validateProductionLimits({ ...valid, budgetCents: PLANS.unlimited.monthlyBudgetCents + 1 }, PLANS.unlimited));
});
test('monthly quota follows Guatemala calendar at UTC month boundaries', () => {
  assert.equal(monthPeriod(new Date('2026-12-01T05:59:59Z')), '2026-11');
  assert.equal(monthPeriod(new Date('2026-12-01T06:00:00Z')), '2026-12');
});
