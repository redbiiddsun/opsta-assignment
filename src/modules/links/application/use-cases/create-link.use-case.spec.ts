import { ExpirationInPastError } from '../../domain/errors/expiration-in-past.error';
import { InvalidDestinationUrlError } from '../../domain/errors/invalid-destination-url.error';
import { InvalidShortCodeError } from '../../domain/errors/invalid-short-code.error';
import { ShortCodeTakenError } from '../../domain/errors/short-code-taken.error';
import {
  CreateLinkUseCase,
  MAX_SHORT_CODE_ATTEMPTS,
} from './create-link.use-case';
import {
  createLink,
  createLinkRepositoryMock,
  createShortCodeGeneratorMock,
  ONE_HOUR_MS,
  OWNER_ID,
} from './testing/fakes';

const DESTINATION_URL = 'https://example.com/';

describe('CreateLinkUseCase', () => {
  const setup = () => {
    const linkRepository = createLinkRepositoryMock();
    const shortCodeGenerator = createShortCodeGeneratorMock();
    const useCase = new CreateLinkUseCase(linkRepository, shortCodeGenerator);
    return { linkRepository, shortCodeGenerator, useCase };
  };

  it('Given no alias, when creating, then a generated code and the normalized URL are stored', async () => {
    // Given
    const { linkRepository, shortCodeGenerator, useCase } = setup();
    shortCodeGenerator.generate.mockReturnValue('gen1234');
    const createdLink = createLink();
    linkRepository.create.mockResolvedValue(createdLink);

    // When
    const link = await useCase.execute({
      ownerId: OWNER_ID,
      destinationUrl: 'HTTPS://Example.com',
    });

    // Then
    expect(linkRepository.create).toHaveBeenCalledWith({
      ownerId: OWNER_ID,
      shortCode: 'gen1234',
      destinationUrl: DESTINATION_URL,
      expiresAt: null,
    });
    expect(link).toBe(createdLink);
  });

  it('Given a generated code that collides, when creating, then it retries with a new code', async () => {
    // Given
    const { linkRepository, shortCodeGenerator, useCase } = setup();
    shortCodeGenerator.generate
      .mockReturnValueOnce('taken01')
      .mockReturnValueOnce('free001');
    linkRepository.create
      .mockRejectedValueOnce(new ShortCodeTakenError())
      .mockResolvedValueOnce(createLink());

    // When
    await useCase.execute({
      ownerId: OWNER_ID,
      destinationUrl: DESTINATION_URL,
    });

    // Then
    expect(linkRepository.create).toHaveBeenCalledTimes(2);
    expect(linkRepository.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ shortCode: 'free001' }),
    );
  });

  it('Given every generated code collides, when creating, then it gives up after the attempt limit', async () => {
    // Given
    const { linkRepository, shortCodeGenerator, useCase } = setup();
    shortCodeGenerator.generate.mockReturnValue('taken01');
    linkRepository.create.mockRejectedValue(new ShortCodeTakenError());

    // When / Then
    await expect(
      useCase.execute({ ownerId: OWNER_ID, destinationUrl: DESTINATION_URL }),
    ).rejects.toThrow(
      `No free short code after ${MAX_SHORT_CODE_ATTEMPTS} attempts`,
    );
    expect(linkRepository.create).toHaveBeenCalledTimes(
      MAX_SHORT_CODE_ATTEMPTS,
    );
  });

  it('Given a database error other than a collision, when creating, then it is rethrown without retrying', async () => {
    // Given
    const { linkRepository, shortCodeGenerator, useCase } = setup();
    shortCodeGenerator.generate.mockReturnValue('gen1234');
    const databaseError = new Error('connection lost');
    linkRepository.create.mockRejectedValue(databaseError);

    // When / Then
    await expect(
      useCase.execute({ ownerId: OWNER_ID, destinationUrl: DESTINATION_URL }),
    ).rejects.toBe(databaseError);
    expect(linkRepository.create).toHaveBeenCalledTimes(1);
  });

  it('Given an alias, when creating, then the alias is the short code and no code is generated', async () => {
    // Given
    const { linkRepository, shortCodeGenerator, useCase } = setup();
    linkRepository.create.mockResolvedValue(createLink());

    // When
    await useCase.execute({
      ownerId: OWNER_ID,
      destinationUrl: DESTINATION_URL,
      alias: 'my-link',
    });

    // Then
    expect(linkRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ shortCode: 'my-link' }),
    );
    expect(shortCodeGenerator.generate).not.toHaveBeenCalled();
  });

  it('Given a taken alias, when creating, then ShortCodeTakenError is thrown without a retry', async () => {
    // Given
    const { linkRepository, useCase } = setup();
    linkRepository.create.mockRejectedValue(new ShortCodeTakenError());

    // When / Then
    await expect(
      useCase.execute({
        ownerId: OWNER_ID,
        destinationUrl: DESTINATION_URL,
        alias: 'my-link',
      }),
    ).rejects.toThrow(ShortCodeTakenError);
    expect(linkRepository.create).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'a javascript: URL',
      { destinationUrl: 'javascript:alert(1)' },
      InvalidDestinationUrlError,
    ],
    [
      'an invalid alias',
      { destinationUrl: DESTINATION_URL, alias: 'a/b' },
      InvalidShortCodeError,
    ],
    [
      'an expiration in the past',
      {
        destinationUrl: DESTINATION_URL,
        expiresAt: new Date(Date.now() - ONE_HOUR_MS),
      },
      ExpirationInPastError,
    ],
  ])(
    'Given %s, when creating, then it is rejected before anything is stored',
    async (_case, input, expectedError) => {
      // Given
      const { linkRepository, useCase } = setup();

      // When / Then
      await expect(
        useCase.execute({ ownerId: OWNER_ID, ...input }),
      ).rejects.toThrow(expectedError);
      expect(linkRepository.create).not.toHaveBeenCalled();
    },
  );
});
