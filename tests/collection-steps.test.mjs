import test from 'node:test';
import assert from 'node:assert/strict';
import { failedCollectors } from '../scripts/check-collection-steps.mjs';
test('partial collection reports failures even when continue-on-error masks conclusion',()=>{
 assert.deepEqual(failedCollectors({collect_riot:{outcome:'failure',conclusion:'success'},collect_images:{outcome:'success'},commit:{outcome:'failure'}}),['collect_riot']);
});
test('cancelled and skipped collectors are not reported as successful',()=>{
 assert.deepEqual(failedCollectors({collect:{outcome:'cancelled'},collect_ai:{outcome:'skipped'},collect_images:{outcome:'success'}}),['collect','collect_ai']);
});
