import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTransition, priceOrder } from './domain.js';
test('delivered orders cannot regress and unpaid refunds are not allowed', () => { assert.equal(canTransition('DELIVERED', 'PREPARING'), false); assert.equal(canTransition('PENDING', 'REFUNDED'), false); assert.equal(canTransition('PREPARING', 'READY'), true); });
test('prices use integer paise and quantities are bounded', () => { assert.equal(priceOrder([{ quantity: 2, price: 15000 }, { quantity: 1, price: 3000 }]), 33000); assert.throws(() => priceOrder([{ quantity: -1, price: 15000 }])); assert.throws(() => priceOrder([{ quantity: 1.5, price: 15000 }])); });
