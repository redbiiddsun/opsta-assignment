import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HELLO_MESSAGE } from './../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('Given the app is running, when a client requests GET /, then it responds 200 with the hello message', () => {
    // Given: app initialised in beforeEach

    // When
    const response = request(app.getHttpServer()).get('/');

    // Then
    return response.expect(HttpStatus.OK).expect(HELLO_MESSAGE);
  });

  afterEach(async () => {
    await app.close();
  });
});
