import { describe, test, expect } from 'bun:test';
import {
  Transform, ToInt, ToFloat, ToBoolean, ToDate, ToLowerCase,
  ToUpperCase, Trim, ToArray, DefaultValue, applyTransforms,
} from './transform.decorator';

describe('type coercion decorators', () => {
  class QueryDto {
    @ToInt() page: any = '7';
    @ToFloat() rate: any = '2.75';
    @ToBoolean() active: any = 'yes';
    @ToBoolean() strict: any = '0';
    @ToBoolean() count: any = 3;
    @ToDate() created: any = '2026-01-15T10:00:00Z';
    @ToLowerCase() email: any = 'Orbit@Dev.IO';
    @ToUpperCase() code: any = 'abc';
    @Trim() name: any = '  spaced  ';
  }

  test('each decorator coerces its target type', () => {
    const dto = new QueryDto();
    applyTransforms(dto);

    expect(dto.page).toBe(7);
    expect(dto.rate).toBe(2.75);
    expect(dto.active).toBe(true);
    expect(dto.strict).toBe(false);
    expect(dto.count).toBe(true);
    expect(dto.created).toBeInstanceOf(Date);
    expect((dto.created as Date).toISOString()).toBe('2026-01-15T10:00:00.000Z');
    expect(dto.email).toBe('orbit@dev.io');
    expect(dto.code).toBe('ABC');
    expect(dto.name).toBe('spaced');
  });

  test('ToInt/ToFloat keep invalid strings as-is', () => {
    class KeepDto {
      @ToInt() n: any = 'not-a-number';
      @ToFloat() f: any = 'also-not';
    }
    const dto = new KeepDto();
    applyTransforms(dto);
    expect(dto.n).toBe('not-a-number');
    expect(dto.f).toBe('also-not');
  });

  test('ToDate keeps invalid date strings untouched', () => {
    class DateDto {
      @ToDate() when: any = 'garbage-date';
  @ToDate() already: any = new Date('2020-05-05');
    }
    const dto = new DateDto();
    applyTransforms(dto);
    expect(dto.when).toBe('garbage-date');
    expect(dto.already).toBeInstanceOf(Date);
  });

  test('non-strings pass through string-only decorators unchanged', () => {
    class PassthroughDto {
      @ToLowerCase() n: any = 42;
  @Trim() b: any = true;
      @ToUpperCase() u: any = undefined;
    }
    const dto = new PassthroughDto();
    applyTransforms(dto);
    expect(dto.n).toBe(42);
    expect(dto.b).toBe(true);
    expect(dto.u).toBeUndefined();
  });
});

describe('ToArray and DefaultValue', () => {
  test('ToArray wraps scalars, keeps arrays, empties null/undefined', () => {
    class ListDto {
      @ToArray() single: any = 'item';
      @ToArray() multiple: any = ['a', 'b'];
      @ToArray() nothing: any = null;
  @ToArray() absent: any = undefined;
    }
    const dto = new ListDto();
    applyTransforms(dto);
    expect(dto.single).toEqual(['item']);
    expect(dto.multiple).toEqual(['a', 'b']);
    expect(dto.nothing).toEqual([]);
    expect(dto.absent).toEqual([]);
  });

  test('DefaultValue substitutes only null and undefined', () => {
    class DefaultDto {
      @DefaultValue(8080) port: any = undefined;
      @DefaultValue('none') blank: any = '';
      @DefaultValue('fallback') real: any = 'value';
    }
    const dto = new DefaultDto();
    applyTransforms(dto);
    expect(dto.port).toBe(8080);
    expect(dto.blank).toBe('');
    expect(dto.real).toBe('value');
  });
});

describe('Transform with custom functions', () => {
  test('custom fn receives both value and the instance', () => {
    class SlugDto {
      @Transform((value: string, obj: any) => `${obj.prefix}:${value}`.toLowerCase())
      slug: any = 'Orbit';

      prefix = 'k';
    }

    const dto = new SlugDto();
    applyTransforms(dto);
    expect(dto.slug).toBe('k:orbit');
  });

  test('later declarations overwrite earlier ones for the same property', () => {
    class OverwriteDto {
      @Transform(() => 'first')
      @Transform(() => 'second')
      value: any = 'x';
    }
    const dto = new OverwriteDto();
    applyTransforms(dto);
    // property decorators apply bottom-up: the second decorator wins
    expect(dto.value).toBe('first');
  });
});

describe('applyTransforms edge cases', () => {
  test('plain objects without metadata pass through unchanged', () => {
    const obj = { a: 1 };
    expect(applyTransforms(obj)).toBe(obj);
  });

  test('transforms chain per-property, not across properties', () => {
    class ChainDto {
      @ToInt() a: any = '3';
      @ToInt() b: any = '4';
    }
    const dto = new ChainDto();
    applyTransforms(dto);
    expect(dto.a).toBe(3);
    expect(dto.b).toBe(4);
  });

  test('metadata is stored on the constructor so subclasses inherit transforms', () => {
    class BaseDto {
      @ToInt() shared: any = '5';
    }
    class ChildDto extends BaseDto {}

    const child = new ChildDto();
    applyTransforms(child);
    expect(child.shared).toBe(5);
  });
});
