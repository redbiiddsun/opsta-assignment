import { Injectable } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { PasswordHasher } from '../../application/contracts/password-hasher';

// argon2id hash of a throwaway value, made with the same library defaults as
// real hashes, so verifying against it costs the same as a real login.
const TIMING_EQUALIZER_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$PRr1NKxryOfP62n944chYw$C/dGCMqs9gXVBZhAUw4EL9ynDjJloCVppWyvjL9YJKc';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword);
  }

  async verify(
    passwordHash: string | null,
    plainPassword: string,
  ): Promise<boolean> {
    const isMatch = await verify(
      passwordHash ?? TIMING_EQUALIZER_HASH,
      plainPassword,
    );
    return passwordHash !== null && isMatch;
  }
}
