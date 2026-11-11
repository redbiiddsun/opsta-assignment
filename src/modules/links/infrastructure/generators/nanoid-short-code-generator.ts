import { Injectable } from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { ShortCodeGenerator } from '../../application/contracts/short-code-generator';

// No - or _: generated codes stay easy to read and type.
const SHORT_CODE_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const SHORT_CODE_LENGTH = 7;

@Injectable()
export class NanoidShortCodeGenerator implements ShortCodeGenerator {
  private readonly nextCode = customAlphabet(
    SHORT_CODE_ALPHABET,
    SHORT_CODE_LENGTH,
  );

  generate(): string {
    return this.nextCode();
  }
}
