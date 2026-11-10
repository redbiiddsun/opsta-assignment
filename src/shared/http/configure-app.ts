import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const API_PREFIX = 'api/v1';
export const SWAGGER_PATH = 'api/docs';

const API_TITLE = 'URL Shortener API';
const API_VERSION = '1.0';

// App-level settings that can't be module providers. Shared by main.ts and
// e2e tests so tests run against the same routing as production.
export const configureApp = (app: INestApplication): void => {
  app.setGlobalPrefix(API_PREFIX);

  const swaggerConfig = new DocumentBuilder()
    .setTitle(API_TITLE)
    .setVersion(API_VERSION)
    .addBearerAuth()
    .build();
  SwaggerModule.setup(SWAGGER_PATH, app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );
};
