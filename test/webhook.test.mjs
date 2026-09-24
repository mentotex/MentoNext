import { verifyWebhookSecret } from '../dist/index.mjs';

let passed = 0, failed = 0;
function check(label, ok) {
  console.log(`${ok ? '✅' : '❌'} ${label}`);
  ok ? passed++ : failed++;
}

check('verifyWebhookSecret: matching secrets return true', verifyWebhookSecret('my-secret-123', 'my-secret-123') === true);
check('verifyWebhookSecret: mismatched secrets return false', verifyWebhookSecret('wrong-secret', 'my-secret-123') === false);
check('verifyWebhookSecret: different-length secrets return false (no throw)', verifyWebhookSecret('short', 'a-much-longer-secret-value') === false);
check('verifyWebhookSecret: null provided returns false', verifyWebhookSecret(null, 'my-secret-123') === false);
check('verifyWebhookSecret: undefined provided returns false', verifyWebhookSecret(undefined, 'my-secret-123') === false);
check('verifyWebhookSecret: empty string provided returns false', verifyWebhookSecret('', 'my-secret-123') === false);
check('verifyWebhookSecret: case-sensitive', verifyWebhookSecret('My-Secret-123', 'my-secret-123') === false);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
