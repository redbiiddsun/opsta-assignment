import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { API_PREFIX } from '../src/shared/http/api-prefix';
import { configureApp } from '../src/shared/http/configure-app';

const LINKS_PATH = `/${API_PREFIX}/links`;
const PASSWORD = 'correct-password';
const DESTINATION_URL = 'https://example.com/landing';
const ONE_HOUR_MS = 3_600_000;
const LINK_NOT_FOUND_BODY = {
  statusCode: HttpStatus.NOT_FOUND,
  error: 'Not Found',
  message: 'Link not found',
};

interface LinkBody {
  id: string;
  shortCode: string;
  shortUrl: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: string | null;
}

interface LinkPageBody {
  items: LinkBody[];
  page: number;
  limit: number;
  total: number;
}

// Random aliases and emails keep tests independent without truncating tables.
const uniqueAlias = () => `e2e-${randomUUID().slice(0, 8)}`;

describe('Links (e2e)', () => {
  let app: INestApplication<App>;

  const server = () => app.getHttpServer();

  const registerAndLogin = async (): Promise<string> => {
    const credentials = {
      email: `user-${randomUUID()}@example.com`,
      password: PASSWORD,
    };
    await request(server())
      .post(`/${API_PREFIX}/auth/register`)
      .send(credentials);
    const response = await request(server())
      .post(`/${API_PREFIX}/auth/login`)
      .send(credentials);
    return (response.body as { accessToken: string }).accessToken;
  };

  const createLink = (accessToken: string, body: object) =>
    request(server())
      .post(LINKS_PATH)
      .auth(accessToken, { type: 'bearer' })
      .send(body);

  const createLinkBody = async (
    accessToken: string,
    body: object = { destinationUrl: DESTINATION_URL },
  ): Promise<LinkBody> =>
    (await createLink(accessToken, body)).body as LinkBody;

  const visit = (shortCode: string) => request(server()).get(`/${shortCode}`);

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

  it('Given a logged-in user, when creating a link without an alias, then it responds 201 with a 7-char code and a shortUrl', async () => {
    // Given
    const accessToken = await registerAndLogin();

    // When
    const response = await createLink(accessToken, {
      destinationUrl: DESTINATION_URL,
    });

    // Then
    expect(response.status).toBe(HttpStatus.CREATED);
    const link = response.body as LinkBody;
    expect(link).toEqual({
      id: expect.any(String),
      shortCode: expect.stringMatching(/^[0-9A-Za-z]{7}$/),
      shortUrl: `http://localhost:3000/${link.shortCode}`,
      destinationUrl: DESTINATION_URL,
      isActive: true,
      expiresAt: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
  });

  it('Given an alias already in use, when another user creates it, then it responds 409', async () => {
    // Given
    const alias = uniqueAlias();
    await createLink(await registerAndLogin(), {
      destinationUrl: DESTINATION_URL,
      alias,
    });

    // When
    const response = await createLink(await registerAndLogin(), {
      destinationUrl: DESTINATION_URL,
      alias,
    });

    // Then
    expect(response.status).toBe(HttpStatus.CONFLICT);
  });

  it.each([
    ['a javascript: URL', { destinationUrl: 'javascript:alert(1)' }],
    ['a reserved alias', { destinationUrl: DESTINATION_URL, alias: 'api' }],
    [
      'a past expiry',
      {
        destinationUrl: DESTINATION_URL,
        expiresAt: new Date(Date.now() - ONE_HOUR_MS).toISOString(),
      },
    ],
    ['an unknown field', { destinationUrl: DESTINATION_URL, ownerId: 'x' }],
    ['a null alias', { destinationUrl: DESTINATION_URL, alias: null }],
  ])(
    'Given %s, when creating a link, then it responds 400',
    async (_case, body) => {
      // Given
      const accessToken = await registerAndLogin();

      // When
      const response = await createLink(accessToken, body);

      // Then
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    },
  );

  it('Given no access token, when creating a link, then it responds 401', async () => {
    // When
    const response = await request(server())
      .post(LINKS_PATH)
      .send({ destinationUrl: DESTINATION_URL });

    // Then
    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('Given two users with links, when one lists, then only their own links come back, newest first and paginated', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const first = await createLinkBody(accessToken);
    const second = await createLinkBody(accessToken);
    await createLinkBody(await registerAndLogin());

    // When
    const response = await request(server())
      .get(LINKS_PATH)
      .query({ page: 1, limit: 1 })
      .auth(accessToken, { type: 'bearer' });

    // Then
    expect(response.status).toBe(HttpStatus.OK);
    const linkPage = response.body as LinkPageBody;
    expect(linkPage).toMatchObject({ page: 1, limit: 1, total: 2 });
    expect(linkPage.items.map(({ id }) => id)).toEqual([second.id]);
    expect(first.id).not.toBe(second.id);
  });

  it.each([
    ['page size', { limit: 101 }],
    ['page number', { page: 10_001 }],
  ])(
    'Given an out-of-range %s, when listing, then it responds 400',
    async (_case, query) => {
      // Given
      const accessToken = await registerAndLogin();

      // When
      const response = await request(server())
        .get(LINKS_PATH)
        .query(query)
        .auth(accessToken, { type: 'bearer' });

      // Then
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    },
  );

  it.each([
    ['a null isActive', { isActive: null }],
    ['a null destinationUrl', { destinationUrl: null }],
  ])(
    'Given %s, when updating a link, then it responds 400',
    async (_case, body) => {
      // Given
      const accessToken = await registerAndLogin();
      const link = await createLinkBody(accessToken);

      // When
      const response = await request(server())
        .patch(`${LINKS_PATH}/${link.id}`)
        .auth(accessToken, { type: 'bearer' })
        .send(body);

      // Then
      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    },
  );

  it('Given a link with an expiry, when updating expiresAt to null, then it responds 200 with no expiry', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLinkBody(accessToken, {
      destinationUrl: DESTINATION_URL,
      expiresAt: new Date(Date.now() + ONE_HOUR_MS).toISOString(),
    });

    // When
    const response = await request(server())
      .patch(`${LINKS_PATH}/${link.id}`)
      .auth(accessToken, { type: 'bearer' })
      .send({ expiresAt: null });

    // Then
    expect(link.expiresAt).not.toBeNull();
    expect(response.status).toBe(HttpStatus.OK);
    expect((response.body as LinkBody).expiresAt).toBeNull();
  });

  it("Given another user's link, when reading, updating or deleting it, then each responds 404 and the link is unchanged", async () => {
    // Given
    const ownerToken = await registerAndLogin();
    const link = await createLinkBody(ownerToken);
    const strangerToken = await registerAndLogin();
    const linkPath = `${LINKS_PATH}/${link.id}`;

    // When
    const responses = await Promise.all([
      request(server()).get(linkPath).auth(strangerToken, { type: 'bearer' }),
      request(server())
        .patch(linkPath)
        .auth(strangerToken, { type: 'bearer' })
        .send({ isActive: false }),
      request(server())
        .delete(linkPath)
        .auth(strangerToken, { type: 'bearer' }),
    ]);

    // Then
    for (const response of responses) {
      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual(LINK_NOT_FOUND_BODY);
    }
    const ownerView = await request(server())
      .get(linkPath)
      .auth(ownerToken, { type: 'bearer' });
    expect((ownerView.body as LinkBody).isActive).toBe(true);
  });

  it('Given a malformed link id, when reading it, then it responds 400', async () => {
    // Given
    const accessToken = await registerAndLogin();

    // When
    const response = await request(server())
      .get(`${LINKS_PATH}/not-a-uuid`)
      .auth(accessToken, { type: 'bearer' });

    // Then
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('Given an active link, when visiting its code, then it responds 302 to the destination', async () => {
    // Given
    const link = await createLinkBody(await registerAndLogin());

    // When
    const response = await visit(link.shortCode);

    // Then
    expect(response.status).toBe(HttpStatus.FOUND);
    expect(response.headers.location).toBe(DESTINATION_URL);
  });

  it('Given an owner deactivates a link and later reactivates it, when visiting, then it is 404 and then 302 again', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLinkBody(accessToken);
    const setActive = (isActive: boolean) =>
      request(server())
        .patch(`${LINKS_PATH}/${link.id}`)
        .auth(accessToken, { type: 'bearer' })
        .send({ isActive });

    // When
    const deactivated = await setActive(false);
    const whileInactive = await visit(link.shortCode);
    await setActive(true);
    const afterReactivating = await visit(link.shortCode);

    // Then
    expect(deactivated.status).toBe(HttpStatus.OK);
    expect((deactivated.body as LinkBody).isActive).toBe(false);
    expect(whileInactive.status).toBe(HttpStatus.NOT_FOUND);
    expect(whileInactive.body).toEqual(LINK_NOT_FOUND_BODY);
    expect(afterReactivating.status).toBe(HttpStatus.FOUND);
  });

  it('Given a link whose expiry has passed, when visiting, then it responds 404', async () => {
    // Given: the API rightly refuses past dates, so the expiry is moved back directly.
    const link = await createLinkBody(await registerAndLogin(), {
      destinationUrl: DESTINATION_URL,
      expiresAt: new Date(Date.now() + ONE_HOUR_MS).toISOString(),
    });
    await app.get(PrismaService).link.update({
      where: { id: link.id },
      data: { expiresAt: new Date(Date.now() - ONE_HOUR_MS) },
    });

    // When
    const response = await visit(link.shortCode);

    // Then
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual(LINK_NOT_FOUND_BODY);
  });

  it.each([
    ['an unknown code', 'zzzzzzz'],
    ['a code that cannot exist', 'favicon.ico'],
  ])('Given %s, when visiting, then it responds 404', async (_case, code) => {
    // When
    const response = await visit(code);

    // Then
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual(LINK_NOT_FOUND_BODY);
  });

  it('Given an alias link, when visiting the alias, then it redirects', async () => {
    // Given
    const alias = uniqueAlias();
    await createLinkBody(await registerAndLogin(), {
      destinationUrl: DESTINATION_URL,
      alias,
    });

    // When
    const response = await visit(alias);

    // Then
    expect(response.status).toBe(HttpStatus.FOUND);
    expect(response.headers.location).toBe(DESTINATION_URL);
  });

  it('Given an owned link, when deleting it, then it responds 204 and the code stops redirecting', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLinkBody(accessToken);

    // When
    const response = await request(server())
      .delete(`${LINKS_PATH}/${link.id}`)
      .auth(accessToken, { type: 'bearer' });

    // Then
    expect(response.status).toBe(HttpStatus.NO_CONTENT);
    expect((await visit(link.shortCode)).status).toBe(HttpStatus.NOT_FOUND);
  });
});
