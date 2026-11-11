import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { API_PREFIX } from './../src/shared/http/api-prefix';
import { configureApp, SWAGGER_PATH } from './../src/shared/http/configure-app';

describe('App infrastructure (e2e)', () => {
  let app: INestApplication<App>;

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

  it('Given the app is running, when a client requests an unknown route, then it responds 404 with the shared error shape', async () => {
    // When
    const response = await request(app.getHttpServer()).get(
      `/${API_PREFIX}/unknown-route`,
    );

    // Then
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Not Found',
      message: `Cannot GET /${API_PREFIX}/unknown-route`,
    });
  });

  it('Given the app is running, when a client requests the Swagger document, then it is served', async () => {
    // When
    const response = await request(app.getHttpServer()).get(
      `/${SWAGGER_PATH}-json`,
    );

    // Then
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toHaveProperty('openapi');
  });
});
