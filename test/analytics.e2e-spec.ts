import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ClickEvent } from '../src/modules/analytics/domain/entities/click-event.entity';
import {
  CLICK_EVENT_REPOSITORY,
  ClickEventRepository,
} from '../src/modules/analytics/domain/repositories/click-event.repository';
import { InProcessEventBus } from '../src/shared/events/in-process-event-bus';
import { PrismaService } from '../src/shared/database/prisma.service';
import { API_PREFIX } from '../src/shared/http/api-prefix';
import { configureApp } from '../src/shared/http/configure-app';

const LINKS_PATH = `/${API_PREFIX}/links`;
const PASSWORD = 'correct-password';

interface ClickBody {
  clickedAt: string;
  referrerOrigin: string | null;
  userAgent: string | null;
}

interface AnalyticsBody {
  totalClicks: number;
  lastClickedAt: string | null;
  clicks: { items: ClickBody[]; page: number; limit: number; total: number };
}

interface CreatedLink {
  id: string;
  shortCode: string;
}

describe('Analytics (e2e)', () => {
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

  const createLink = async (accessToken: string): Promise<CreatedLink> => {
    const response = await request(server())
      .post(LINKS_PATH)
      .auth(accessToken, { type: 'bearer' })
      .send({ destinationUrl: 'https://example.com/' });
    return response.body as CreatedLink;
  };

  const visit = (shortCode: string, referrer?: string) => {
    const visitRequest = request(server())
      .get(`/${shortCode}`)
      .set('User-Agent', 'e2e-agent');
    return referrer ? visitRequest.set('Referer', referrer) : visitRequest;
  };

  // Clicks are written on the next tick; draining the bus waits for them
  // deterministically instead of sleeping.
  const waitForRecordedClicks = () =>
    app.get(InProcessEventBus).beforeApplicationShutdown();

  const getAnalytics = (
    accessToken: string,
    linkId: string,
    query: object = {},
  ) =>
    request(server())
      .get(`${LINKS_PATH}/${linkId}/analytics`)
      .query(query)
      .auth(accessToken, { type: 'bearer' });

  const createApp = async (): Promise<INestApplication<App>> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const nestApp =
      moduleFixture.createNestApplication<INestApplication<App>>();
    configureApp(nestApp);
    await nestApp.init();
    return nestApp;
  };

  const countClicks = (linkId: string) =>
    app.get(PrismaService).clickEvent.count({ where: { linkId } });

  beforeEach(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('Given a link visited twice, when its owner reads analytics, then both clicks show newest first with the referrer reduced to its origin', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLink(accessToken);
    await visit(link.shortCode, 'https://news.example/post/1?user=42');
    await visit(link.shortCode);
    await waitForRecordedClicks();

    // When
    const response = await getAnalytics(accessToken, link.id);

    // Then
    expect(response.status).toBe(HttpStatus.OK);
    const analytics = response.body as AnalyticsBody;
    expect(analytics).toMatchObject({
      totalClicks: 2,
      lastClickedAt: expect.any(String),
      clicks: { page: 1, limit: 20, total: 2 },
    });
    expect(analytics.clicks.items).toEqual([
      {
        clickedAt: expect.any(String),
        referrerOrigin: null,
        userAgent: 'e2e-agent',
      },
      {
        clickedAt: expect.any(String),
        referrerOrigin: 'https://news.example',
        userAgent: 'e2e-agent',
      },
    ]);
    expect(analytics.lastClickedAt).toBe(analytics.clicks.items[0].clickedAt);
  });

  it('Given a new link, when its owner reads analytics, then there are no clicks', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLink(accessToken);

    // When
    const response = await getAnalytics(accessToken, link.id);

    // Then
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      totalClicks: 0,
      lastClickedAt: null,
      clicks: { items: [], page: 1, limit: 20, total: 0 },
    });
  });

  it('Given three clicks, when reading page 2 with limit 2, then one click remains and the total stays 3', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLink(accessToken);
    for (let visitCount = 0; visitCount < 3; visitCount++) {
      await visit(link.shortCode);
    }
    await waitForRecordedClicks();

    // When
    const response = await getAnalytics(accessToken, link.id, {
      page: 2,
      limit: 2,
    });

    // Then
    const analytics = response.body as AnalyticsBody;
    expect(analytics.totalClicks).toBe(3);
    expect(analytics.clicks).toMatchObject({ page: 2, limit: 2, total: 3 });
    expect(analytics.clicks.items).toHaveLength(1);
  });

  it('Given a deactivated link, when it is visited, then no click is recorded', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLink(accessToken);
    await request(server())
      .patch(`${LINKS_PATH}/${link.id}`)
      .auth(accessToken, { type: 'bearer' })
      .send({ isActive: false });

    // When
    const visitResponse = await visit(link.shortCode);
    await waitForRecordedClicks();

    // Then
    expect(visitResponse.status).toBe(HttpStatus.NOT_FOUND);
    const analytics = (await getAnalytics(accessToken, link.id))
      .body as AnalyticsBody;
    expect(analytics.totalClicks).toBe(0);
  });

  it("Given another user's link, when reading its analytics, then it responds 404", async () => {
    // Given
    const link = await createLink(await registerAndLogin());

    // When
    const response = await getAnalytics(await registerAndLogin(), link.id);

    // Then
    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({
      statusCode: HttpStatus.NOT_FOUND,
      error: 'Not Found',
      message: 'Link not found',
    });
  });

  it('Given no token or a malformed id, when reading analytics, then it responds 401 or 400', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLink(accessToken);

    // When
    const withoutToken = await request(server()).get(
      `${LINKS_PATH}/${link.id}/analytics`,
    );
    const malformedId = await getAnalytics(accessToken, 'not-a-uuid');

    // Then
    expect(withoutToken.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(malformedId.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('Given a link with clicks, when the link is deleted, then its clicks are deleted too', async () => {
    // Given
    const accessToken = await registerAndLogin();
    const link = await createLink(accessToken);
    await visit(link.shortCode);
    await waitForRecordedClicks();
    expect(await countClicks(link.id)).toBe(1);

    // When
    const deleteResponse = await request(server())
      .delete(`${LINKS_PATH}/${link.id}`)
      .auth(accessToken, { type: 'bearer' });

    // Then
    expect(deleteResponse.status).toBe(HttpStatus.NO_CONTENT);
    expect(await countClicks(link.id)).toBe(0);
  });

  it('Given a click still being recorded, when the app closes, then the click is persisted before the database disconnects', async () => {
    // Given
    const link = await createLink(await registerAndLogin());
    await visit(link.shortCode);

    // When
    await app.close();

    // Then
    // Reassigned so afterEach closes the fresh app instead of the closed one.
    app = await createApp();
    expect(await countClicks(link.id)).toBe(1);
  });

  it('Given the same event recorded twice and one for a deleted link, when recording, then there is one row and no error', async () => {
    // Given
    const link = await createLink(await registerAndLogin());
    const repository = app.get<ClickEventRepository>(CLICK_EVENT_REPOSITORY, {
      strict: false,
    });
    const click = new ClickEvent(randomUUID(), link.id, new Date(), null, null);
    const clickForMissingLink = new ClickEvent(
      randomUUID(),
      randomUUID(),
      new Date(),
      null,
      null,
    );

    // When
    await repository.record(click);
    await repository.record(click);
    const missingLinkRecording = repository.record(clickForMissingLink);

    // Then
    await expect(missingLinkRecording).resolves.toBeUndefined();
    const storedClicks = await app
      .get(PrismaService)
      .clickEvent.count({ where: { id: click.id } });
    expect(storedClicks).toBe(1);
  });
});
