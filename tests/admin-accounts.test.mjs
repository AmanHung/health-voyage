import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { environment } from './helpers/google-environment.mjs';
function change(e, email, operation, version, auth) {
  return e.call(
    'admin.accountChange',
    { email, operation, version, requestId: randomUUID() },
    auth,
  );
}
test('new administrator can sign in; removing them revokes cached access immediately', () => {
  const e = environment();
  const other = e.auth('other');
  assert.equal(e.call('bootstrap', {}, other).ok, false);
  const initial = e.call('admin.accounts').data;
  const body = {
    email: 'Other@Example.Test',
    operation: 'add',
    version: initial.version,
    requestId: randomUUID(),
  };
  const added = e.call('admin.accountChange', body);
  assert.equal(added.ok, true, added.error);
  assert.equal(
    e.call('admin.accountChange', body).data.version,
    added.data.version,
  );
  assert.equal(e.call('bootstrap', {}, other).data.role, 'admin');
  assert.equal(e.call('bootstrap', {}, other).data.email, 'other@example.test');
  assert.equal(e.call('admin.patients', {}, other).ok, true);
  assert.equal(
    change(e, 'other@example.test', 'remove', added.data.version).ok,
    true,
  );
  assert.equal(e.call('admin.patients', {}, other).ok, false);
  assert.equal(
    e.call('medication.read', { patientId: 'any' }, other).ok,
    false,
  );
});
test('last administrator, invalid input, stale changes and non-admin access are protected', () => {
  const e = environment();
  const p = e.patient('A');
  const initial = e.call('admin.accounts').data;
  assert.equal(
    change(e, initial.emails[0], 'remove', initial.version).ok,
    false,
  );
  assert.equal(change(e, 'bad', 'add', initial.version).ok, false);
  assert.equal(change(e, 'other@example.test', 'add', 'outdated').ok, false);
  assert.equal(e.call('admin.accounts', {}, p.identity).ok, false);
  assert.equal(
    change(e, 'other@example.test', 'add', initial.version, p.identity).ok,
    false,
  );
  const assigned = e.call('admin.medicationStaff', {
    patientId: p.id,
    emails: ['other@example.test'],
    previousId: null,
    requestId: randomUUID(),
  });
  assert.equal(assigned.ok, true);
  assert.equal(e.call('admin.accounts', {}, e.auth('other')).ok, false);
  const added = change(e, 'other@example.test', 'add', initial.version);
  assert.equal(added.ok, true);
  assert.equal(e.call('bootstrap', {}, e.auth('other')).data.role, 'admin');
  assert.equal(
    change(e, 'other@example.test', 'remove', added.data.version).ok,
    true,
  );
  assert.equal(
    e.call('bootstrap', {}, e.auth('other')).data.role,
    'pharmacist',
  );
});
