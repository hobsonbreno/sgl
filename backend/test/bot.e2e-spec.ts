import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { BotModule } from '../src/bot/bot.module';
import { getModelToken } from '@nestjs/mongoose';
import { BotExecucao } from '../src/bot/bot-execucao.schema';
import { PncpClientService } from '../src/pncp/services/pncp-client/pncp-client.service';
import { BotService } from '../src/bot/bot.service';
import { SchedulerRegistry } from '@nestjs/schedule';

describe('BotController (e2e)', () => {
  let app: INestApplication;
  let mockBotService = {
    executarBuscaDiaria: jest.fn().mockResolvedValue([{ id: 'test' }]),
  };

  let mockBotExecucaoModel = {
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([{ dataExecucao: new Date() }]),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BotModule],
    })
      .overrideProvider(BotService)
      .useValue(mockBotService)
      .overrideProvider(getModelToken(BotExecucao.name))
      .useValue(mockBotExecucaoModel)
      .overrideProvider(PncpClientService)
      .useValue({})
      .overrideProvider(SchedulerRegistry)
      .useValue({ addCronJob: jest.fn(), getCronJobs: jest.fn().mockReturnValue(new Map()), doesExist: jest.fn().mockReturnValue(false) })
      // Because BotModule might import other things that try to connect to DB, we would ideally override them or use memory DB. 
      // For simplicity in this architectural E2E, we mock the service completely.
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/bot/run-now (POST)', () => {
    return request(app.getHttpServer())
      .post('/bot/run-now')
      .expect(201)
      .expect([{ id: 'test' }]);
  });

  it('/bot/execucoes (GET)', () => {
    return request(app.getHttpServer())
      .get('/bot/execucoes')
      .expect(200);
  });
});
