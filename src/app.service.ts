import { Injectable } from '@nestjs/common';

export const HELLO_MESSAGE = 'Hello World!';

@Injectable()
export class AppService {
  getHello(): string {
    return HELLO_MESSAGE;
  }
}
