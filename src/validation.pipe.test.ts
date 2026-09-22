import { describe, test, expect } from 'bun:test';
import { ValidationPipe, ZodValidationPipe, createZodDto } from './validation.pipe';
import type { ArgumentMetadata } from '@galaxy-stack/orbit-core';

// Minimal zod-compatible schema stub (no external dependency needed)
function fakeZodSchema(fn: (v: unknown) => any) {
  return {
    parse(data: unknown) {
      const r = fn(data);
      if (!r.ok) throw new Error('parse failed');
      return r.data;
    },
    safeParse(data: unknown) {
      const r = fn(data);
      return r.ok ? { success: true, data: r.data } : { success: false, error: { errors: r.issues } };
    },
  };
}

const meta: ArgumentMetadata = { type: 'body' };

describe('ValidationPipe', () => {
  test('returns value untouched when no schema is provided', async () => {
    const pipe = new ValidationPipe();
    expect(await pipe.transform({ a: 1 }, meta)).toEqual({ a: 1 });
  });

  test('passes through falsy values without validation', async () => {
    const pipe = new ValidationPipe({ schema: neverSchema() });
    expect(await pipe.transform(undefined, meta)).toBeUndefined();
    expect(await pipe.transform(0, meta)).toBe(0);
  });

  test('validates and transforms valid data', async () => {
    const schema = fakeZodSchema((v: any) =>
      typeof v === 'object' && v.name ? { ok: true, data: { ...v, name: v.name.trim() } } : { ok: false, data: undefined, errors: [{ path: ['name'], message: 'required' }] }
    );
    const pipe = new ValidationPipe({ schema, transform: true });
    const result = await pipe.transform({ name: 'orbit' }, meta);
    expect(result).toEqual({ name: 'orbit' });
  });

  test('throws BadRequestException with status 400 on failure', async () => {
    const schema = fakeZodSchema(() => ({
      ok: false,
      data: undefined,
      issues: [
        { path: ['name'], message: 'required' },
        { path: ['age'], message: 'must be a number' },
      ],
    }));
    const pipe = new ValidationPipe({ schema });
    await expect(pipe.transform({}, meta)).rejects.toMatchObject({ status: 400 });
  });

  test('disableErrorMessages hides details', async () => {
    const schema = fakeZodSchema(() => ({ ok: false, data: undefined, issues: [{ path: ['x'], message: 'secret detail' }] }));
    const pipe = new ValidationPipe({ schema, disableErrorMessages: true });
    let caught: any;
    try { await pipe.transform({}, meta); } catch (e) { caught = e; }
    expect(caught).toBeDefined();
    expect(caught.message).not.toContain('secret detail');
  });

  test('exceptionFactory overrides default error', async () => {
    const schema = fakeZodSchema(() => ({ ok: false, data: undefined, issues: [{ path: ['x'], message: 'bad' }] }));
    const pipe = new ValidationPipe({ schema, exceptionFactory: (errors) => new Error(`custom: ${errors.join('|')}`) });
    await expect(pipe.transform({}, meta)).rejects.toThrow('custom: x: bad');
  });

  test('transform: false returns original value', async () => {
    const schema = fakeZodSchema((v: any) => ({ ok: true, data: { ...v, extra: true } }));
    const pipe = new ValidationPipe({ schema, transform: false });
    const input = { name: 'a' };
    expect(await pipe.transform(input, meta)).toEqual({ name: 'a' });
  });
});

describe('ZodValidationPipe', () => {
  test('throws BadRequestException with formatted errors', () => {
    const schema = fakeZodSchema(() => ({
      ok: false,
      data: undefined,
      issues: [
        { path: ['user', 'email'], message: 'invalid email' },
        { path: [], message: 'root error' },
      ],
    }));
    const pipe = new ZodValidationPipe(schema as any);
    expect(() => pipe.transform({}, meta)).toThrow(/user\.email: invalid email/);
  });

  test('returns parsed data on success', () => {
    const schema = fakeZodSchema((v: any) => ({ ok: true, data: { ...v, normalized: true } }));
    const pipe = new ZodValidationPipe(schema as any);
    expect(pipe.transform({ a: 1 }, meta)).toEqual({ a: 1, normalized: true });
  });
});

describe('createZodDto', () => {
  test('parses data in constructor and exposes static schema', () => {
    const schema = fakeZodSchema((v: any) => ({ ok: true, data: { name: String(v.name).toUpperCase() } }));
    const Dto = createZodDto(schema as any);
    const dto = new Dto({ name: 'orbit' });
    expect(dto.name).toBe('ORBIT');
    expect((Dto as any).schema).toBe(schema);
  });
});

// A schema that must never be invoked
function neverSchema() {
  return {
    parse() { throw new Error('must not be called'); },
    safeParse() { throw new Error('must not be called'); },
  } as any;
}
