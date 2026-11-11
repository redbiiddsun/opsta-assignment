import { INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';

const API_TITLE = 'URL Shortener API';
const API_VERSION = '1.0';

// Behind the web container's nginx every request arrives from nginx's private
// address, so rate limits would be shared by all visitors. Trusting
// X-Forwarded-For from loopback/private hops only gives each visitor their own
// limit. This is only safe because nginx overwrites X-Forwarded-For with the
// address it saw and the API port is bound to localhost (docker-compose.yml);
// any private-address client that reaches the API directly can spoof its IP.
const TRUSTED_PROXIES = 'loopback, linklocal, uniquelocal';

// App-level settings that can't be module providers. Shared by main.ts and
// e2e tests so tests run against the same routing as production.
export const configureApp = (app: INestApplication): void => {
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter instanceof ExpressAdapter) {
    httpAdapter.set('trust proxy', TRUSTED_PROXIES);
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle(API_TITLE)
    .setVersion(API_VERSION)
    .addBearerAuth()
    .build();
  SwaggerModule.setup(SWAGGER_PATH, app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );
};
