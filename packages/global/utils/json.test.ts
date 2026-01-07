
import { describe, it, expect } from 'vitest';
import { extractJson } from './json';

describe('extractJson', () => {
  it('should extract json from markdown block', () => {
    const text = 'Here is the json:\n```json\n{"foo": "bar"}\n```';
    expect(extractJson(text)).toEqual({ foo: 'bar' });
  });

  it('should extract json from plain block', () => {
    const text = '```\n{"foo": "bar"}\n```';
    expect(extractJson(text)).toEqual({ foo: 'bar' });
  });

  it('should extract raw json', () => {
    const text = 'Some text {"foo": "bar"} end text';
    expect(extractJson(text)).toEqual({ foo: 'bar' });
  });

  it('should extract json with nested braces', () => {
    const text = 'Start {"foo": {"bar": "baz"}} End';
    expect(extractJson(text)).toEqual({ foo: { bar: 'baz' } });
  });

  it('should return null for invalid json', () => {
    const text = 'No json here';
    expect(extractJson(text)).toBeNull();
  });
});
