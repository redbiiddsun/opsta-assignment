export const SHORT_CODE_GENERATOR = Symbol('SHORT_CODE_GENERATOR');

// A port so collision retries can be tested with a generator that repeats itself.
export interface ShortCodeGenerator {
  generate(): string;
}
