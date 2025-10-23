import { normalizeGoogleLead } from '../adapters/google.adapter';
import { normalizeFacebookLead } from '../adapters/facebook.adapter';

describe('Adapters', () => {
  test('normalizeGoogleLead extracts common fields', () => {
    const payload = { user: { email: 'a@b.com', phone: '+1', name: 'Alice' }, answers: [{ question: 'age', answer: '30' }], utm: { source: 'google', campaign: 'camp' } };
    const out = normalizeGoogleLead(payload as any);
    expect(out.email).toBe('a@b.com');
    expect(out.phone).toBe('+1');
    expect(out.name).toBe('Alice');
    expect(out.customFields.age).toBe('30');
    expect(out.utmSource).toBe('google');
  });

  test('normalizeFacebookLead extracts common fields', () => {
    const payload = { entry: [{ changes: [{ value: { email: 'b@c.com', phone_number: '+2', full_name: 'Bob', answers: [{ name: 'q1', text: 'v1' }] } }] }] };
    const out = normalizeFacebookLead(payload as any);
    expect(out.email).toBe('b@c.com');
    expect(out.phone).toBe('+2');
    expect(out.name).toBe('Bob');
    expect(out.customFields.q1).toBe('v1');
  });
});
