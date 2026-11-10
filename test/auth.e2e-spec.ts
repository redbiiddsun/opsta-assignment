import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { API_PREFIX, configureApp } from '../src/shared/http/configure-app';

const REGISTER_PATH = `/${API_PREFIX}/auth/register`;
const LOGIN_PATH = `/${API_PREFIX}/auth/login`;
const AUTH_ROUTE_LIMIT = 5;
const PASSWORD = 'correct-password';
const INVALID_CREDENTIALS_BODY = {
  statusCode: HttpStatus.UNAUTHORIZED,
  error: 'Unauthorized',
  message: 'Invalid email or password',
};

// A fresh address per test keeps tests independent without truncating tables.
const uniqueEmail = () => `user-${randomUUID()}@example.com`;

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const register = (body: object) =>
    request(app.getHttpServer()).post(REGISTER_PATH).send(body);
  const login = (body: object) =>
    request(app.getHttpServer()).post(LOGIN_PATH).send(body);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('Given a new email in mixed case, when registering, then it responds 201 with the lowercased user and no password hash', async () => {
    // Given
    const email = uniqueEmail();

    // When
    const response = await register({
      email: email.toUpperCase(),
      password: PASSWORD,
    });

    // Then
    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({
      id: expect.any(String),
      email,
      createdAt: expect.any(String),
    });
  });

  it('Given an email that is already registered, when registering again with different casing, then it responds 409', async () => {
    // Given
    const email = uniqueEmail();
    await register({ email, password: PASSWORD });

    // When
    const response = await register({
      email: email.toUpperCase(),
      password: PASSWORD,
    });

    // Then
    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message: 'Email is already registered',
    });
  });

  it.each([
    ['a malformed email', { email: 'not-an-email', password: PASSWORD }],
    ['a short password', { email: 'user@example.com', password: 'short' }],
    [
      'an unknown field',
      { email: 'user@example.com', password: PASSWORD, role: 'admin' },
    ],
  ])(
    'Given %s, when registering, then it responds 400',
    async (_case, body) => {
      // When
      const response = await register(body);

      // Then
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    },
  );

  it('Given a registered user, when logging in with the right password, then it responds 200 with a bearer token', async () => {
    // Given
    const email = uniqueEmail();
    await register({ email, password: PASSWORD });

    // When
    const response = await login({ email, password: PASSWORD });

    // Then
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      accessToken: expect.any(String),
      tokenType: 'Bearer',
      expiresIn: expect.any(String),
    });
  });

  it('Given a registered user, when logging in with a wrong password or an unknown email, then both respond with the identical 401', async () => {
    // Given
    const email = uniqueEmail();
    await register({ email, password: PASSWORD });

    // When
    const wrongPassword = await login({ email, password: 'wrong-password' });
    const unknownEmail = await login({
      email: uniqueEmail(),
      password: PASSWORD,
    });

    // Then
    expect(wrongPassword.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(wrongPassword.body).toEqual(INVALID_CREDENTIALS_BODY);
    expect(unknownEmail.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(unknownEmail.body).toEqual(INVALID_CREDENTIALS_BODY);
  });

  it('Given the login limit is used up, when one more login is attempted, then it responds 429', async () => {
    // Given
    const credentials = { email: uniqueEmail(), password: PASSWORD };
    for (let attempt = 0; attempt < AUTH_ROUTE_LIMIT; attempt++) {
      await login(credentials);
    }

    // When
    const response = await login(credentials);

    // Then
    expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });
});
