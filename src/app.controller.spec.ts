import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService, HELLO_MESSAGE } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const testingModule: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = testingModule.get<AppController>(AppController);
  });

  it('Given the app is running, when the root handler is called, then it returns the hello message', () => {
    // When
    const message = appController.getHello();

    // Then
    expect(message).toBe(HELLO_MESSAGE);
  });
});
