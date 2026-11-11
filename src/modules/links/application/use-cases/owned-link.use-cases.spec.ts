import { ExpirationInPastError } from '../../domain/errors/expiration-in-past.error';
import { InvalidDestinationUrlError } from '../../domain/errors/invalid-destination-url.error';
import { LinkNotFoundError } from '../../domain/errors/link-not-found.error';
import { DeleteLinkUseCase } from './delete-link.use-case';
import { GetLinkUseCase } from './get-link.use-case';
import { ListLinksUseCase } from './list-links.use-case';
import { UpdateLinkUseCase } from './update-link.use-case';
import {
  createLink,
  createLinkRepositoryMock,
  ONE_HOUR_MS,
  OTHER_USER_ID,
  OWNER_ID,
} from './testing/fakes';

const setup = () => {
  const linkRepository = createLinkRepositoryMock();
  const getLinkUseCase = new GetLinkUseCase(linkRepository);
  return {
    linkRepository,
    getLinkUseCase,
    updateLinkUseCase: new UpdateLinkUseCase(linkRepository, getLinkUseCase),
    deleteLinkUseCase: new DeleteLinkUseCase(linkRepository, getLinkUseCase),
  };
};

describe('GetLinkUseCase', () => {
  it('Given the owner, when getting the link, then it is returned', async () => {
    // Given
    const { linkRepository, getLinkUseCase } = setup();
    const link = createLink();
    linkRepository.findById.mockResolvedValue(link);

    // When / Then
    await expect(
      getLinkUseCase.execute({ linkId: link.id, userId: OWNER_ID }),
    ).resolves.toBe(link);
  });

  it.each([
    ['another user', createLink(), OTHER_USER_ID],
    ['a missing link', null, OWNER_ID],
  ])(
    'Given %s, when getting the link, then LinkNotFoundError is thrown',
    async (_case, storedLink, userId) => {
      // Given
      const { linkRepository, getLinkUseCase } = setup();
      linkRepository.findById.mockResolvedValue(storedLink);

      // When / Then
      await expect(
        getLinkUseCase.execute({ linkId: 'link-id', userId }),
      ).rejects.toThrow(LinkNotFoundError);
    },
  );
});

describe('UpdateLinkUseCase', () => {
  it('Given the owner and new values, when updating, then only the given fields are changed and the URL is normalized', async () => {
    // Given
    const { linkRepository, updateLinkUseCase } = setup();
    linkRepository.findById.mockResolvedValue(createLink());
    const updatedLink = createLink({ isActive: false });
    linkRepository.update.mockResolvedValue(updatedLink);

    // When
    const link = await updateLinkUseCase.execute({
      linkId: 'link-id',
      userId: OWNER_ID,
      destinationUrl: 'HTTPS://New.example.com',
      isActive: false,
    });

    // Then
    expect(linkRepository.update).toHaveBeenCalledWith('link-id', {
      destinationUrl: 'https://new.example.com/',
      isActive: false,
    });
    expect(link).toBe(updatedLink);
  });

  it('Given expiresAt null, when updating, then the expiry is cleared', async () => {
    // Given
    const { linkRepository, updateLinkUseCase } = setup();
    linkRepository.findById.mockResolvedValue(
      createLink({ expiresAt: new Date(Date.now() + ONE_HOUR_MS) }),
    );
    linkRepository.update.mockResolvedValue(createLink());

    // When
    await updateLinkUseCase.execute({
      linkId: 'link-id',
      userId: OWNER_ID,
      expiresAt: null,
    });

    // Then
    expect(linkRepository.update).toHaveBeenCalledWith('link-id', {
      expiresAt: null,
    });
  });

  it('Given no changes, when updating, then the link is returned without a write', async () => {
    // Given
    const { linkRepository, updateLinkUseCase } = setup();
    const link = createLink();
    linkRepository.findById.mockResolvedValue(link);

    // When / Then
    await expect(
      updateLinkUseCase.execute({ linkId: 'link-id', userId: OWNER_ID }),
    ).resolves.toBe(link);
    expect(linkRepository.update).not.toHaveBeenCalled();
  });

  it.each([
    [
      'another user',
      { userId: OTHER_USER_ID, isActive: false },
      LinkNotFoundError,
    ],
    [
      'an unsupported URL',
      { userId: OWNER_ID, destinationUrl: 'javascript:alert(1)' },
      InvalidDestinationUrlError,
    ],
    [
      'a past expiry',
      { userId: OWNER_ID, expiresAt: new Date(Date.now() - ONE_HOUR_MS) },
      ExpirationInPastError,
    ],
  ])(
    'Given %s, when updating, then it is rejected without a write',
    async (_case, input, expectedError) => {
      // Given
      const { linkRepository, updateLinkUseCase } = setup();
      linkRepository.findById.mockResolvedValue(createLink());

      // When / Then
      await expect(
        updateLinkUseCase.execute({ linkId: 'link-id', ...input }),
      ).rejects.toThrow(expectedError);
      expect(linkRepository.update).not.toHaveBeenCalled();
    },
  );
});

describe('DeleteLinkUseCase', () => {
  it('Given the owner, when deleting, then the link is deleted', async () => {
    // Given
    const { linkRepository, deleteLinkUseCase } = setup();
    linkRepository.findById.mockResolvedValue(createLink());

    // When
    await deleteLinkUseCase.execute({ linkId: 'link-id', userId: OWNER_ID });

    // Then
    expect(linkRepository.delete).toHaveBeenCalledWith('link-id');
  });

  it('Given another user, when deleting, then LinkNotFoundError is thrown and nothing is deleted', async () => {
    // Given
    const { linkRepository, deleteLinkUseCase } = setup();
    linkRepository.findById.mockResolvedValue(createLink());

    // When / Then
    await expect(
      deleteLinkUseCase.execute({ linkId: 'link-id', userId: OTHER_USER_ID }),
    ).rejects.toThrow(LinkNotFoundError);
    expect(linkRepository.delete).not.toHaveBeenCalled();
  });
});

describe('ListLinksUseCase', () => {
  it('Given a page request, when listing, then the owner page is returned with its paging info', async () => {
    // Given
    const linkRepository = createLinkRepositoryMock();
    const links = [createLink()];
    linkRepository.listByOwner.mockResolvedValue({ items: links, total: 21 });

    // When
    const linkPage = await new ListLinksUseCase(linkRepository).execute({
      ownerId: OWNER_ID,
      page: 2,
      limit: 20,
    });

    // Then
    expect(linkRepository.listByOwner).toHaveBeenCalledWith(OWNER_ID, {
      page: 2,
      limit: 20,
    });
    expect(linkPage).toEqual({ items: links, page: 2, limit: 20, total: 21 });
  });
});
