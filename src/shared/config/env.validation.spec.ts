import 'reflect-metadata';
import { validateEnvironment } from './env.validation';

const validEnvironment = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: 'a'.repeat(32),
  JWT_ISSUER: 'issuer',
  JWT_AUDIENCE: 'audience',
};

describe('validateEnvironment', () => {
  it('Given required variables only, when validated, then defaults are applied', () => {
    // When
    const environment = validateEnvironment(validEnvironment);

    // Then
    expect(environment.PORT).toBe(3000);
    expect(environment.JWT_EXPIRES_IN).toBe('15m');
  });

  it('Given PORT as a string, when validated, then it is converted to a number', () => {
    // When
    const environment = validateEnvironment({
      ...validEnvironment,
      PORT: '8080',
    });

    // Then
    expect(environment.PORT).toBe(8080);
  });

  it('Given DATABASE_URL is missing, when validated, then it throws naming the variable', () => {
    // Given
    const withoutDatabaseUrl = { ...validEnvironment, DATABASE_URL: undefined };

    // When / Then
    expect(() => validateEnvironment(withoutDatabaseUrl)).toThrow(
      /DATABASE_URL/,
    );
  });

  it('Given a short JWT_SECRET, when validated, then it throws without echoing the secret', () => {
    // Given
    const shortSecret = 'too-short-secret';

    // When / Then
    expect(() =>
      validateEnvironment({ ...validEnvironment, JWT_SECRET: shortSecret }),
    ).toThrow(/^(?!.*too-short-secret).*JWT_SECRET/);
  });
});
