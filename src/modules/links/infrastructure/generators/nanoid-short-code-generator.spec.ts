import { ShortCode } from '../../domain/value-objects/short-code.vo';
import { NanoidShortCodeGenerator } from './nanoid-short-code-generator';

describe('NanoidShortCodeGenerator', () => {
  it('Given the generator, when generating codes, then each is 7 alphanumeric chars that the redirect accepts', () => {
    // Given
    const generator = new NanoidShortCodeGenerator();

    // When
    const codes = Array.from({ length: 50 }, () => generator.generate());

    // Then
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-Za-z]{7}$/);
      expect(ShortCode.isWellFormed(code)).toBe(true);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });
});
