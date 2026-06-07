import { describe, it, expect } from 'vitest';
import { isValidCpf } from './cpf';

describe('isValidCpf', () => {
  it('accepts a valid CPF', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
  });
  it('rejects too-short input', () => {
    expect(isValidCpf('123')).toBe(false);
  });
  it('rejects all-same-digit CPFs', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false);
  });
});
