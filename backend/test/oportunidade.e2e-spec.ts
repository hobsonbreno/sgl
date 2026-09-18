import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { OportunidadeModule } from '../src/oportunidade/oportunidade.module';
import { getModelToken } from '@nestjs/mongoose';
import { Oportunidade } from '../src/oportunidade/oportunidade.schema';
import { PncpClientService } from '../src/pncp/services/pncp-client/pncp-client.service';
import { OportunidadeService } from '../src/oportunidade/oportunidade.service';
import { SimulacaoEstrategia } from '../src/oportunidade/schemas/simulacao-estrategia.schema';
import { Produto } from '../src/produto/produto.schema';
import { Cotacao } from '../src/cotacao/cotacao.schema';

describe('OportunidadeController (e2e)', () => {
  let app: INestApplication;
  
  let mockOportunidadeService = {
    findAll: jest.fn().mockResolvedValue([{ _id: '123' }]),
    findOne: jest.fn().mockResolvedValue({ _id: '123' }),
    updateStatus: jest.fn().mockResolvedValue({ _id: '123', status: 'test' }),
    marcarVisualizado: jest.fn().mockResolvedValue({ _id: '123', visualizado: true }),
    sincronizarItens: jest.fn().mockResolvedValue({ success: true }),
    remove: jest.fn().mockResolvedValue({ deleted: true }),
    importarManual: jest.fn().mockResolvedValue({ imported: true }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OportunidadeModule],
    })
      .overrideProvider(OportunidadeService)
      .useValue(mockOportunidadeService)
      // Mocks for DB and external dependencies that might get initialized in module
      .overrideProvider(getModelToken(Oportunidade.name))
      .useValue({})
      .overrideProvider(getModelToken(SimulacaoEstrategia.name))
      .useValue({})
      .overrideProvider(getModelToken(Produto.name))
      .useValue({})
      .overrideProvider(getModelToken(Cotacao.name))
      .useValue({})
      .overrideProvider(PncpClientService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/oportunidades (GET)', () => {
    return request(app.getHttpServer())
      .get('/oportunidades')
      .expect(200)
      .expect([{ _id: '123' }]);
  });

  it('/oportunidades/:id (GET)', () => {
    return request(app.getHttpServer())
      .get('/oportunidades/123')
      .expect(200)
      .expect({ _id: '123' });
  });

  it('/oportunidades/:id/status (PATCH)', () => {
    return request(app.getHttpServer())
      .patch('/oportunidades/123/status')
      .send({ kanbanStatus: 'test' })
      .expect(200)
      .expect({ _id: '123', status: 'test' });
  });

  it('/oportunidades/:id/visualizado (PATCH)', () => {
    return request(app.getHttpServer())
      .patch('/oportunidades/123/visualizado')
      .expect(200)
      .expect({ _id: '123', visualizado: true });
  });

  it('/oportunidades/:id/sincronizar-itens (POST)', () => {
    return request(app.getHttpServer())
      .post('/oportunidades/123/sincronizar-itens')
      .expect(201)
      .expect({ success: true });
  });

  it('/oportunidades/:id (DELETE)', () => {
    return request(app.getHttpServer())
      .delete('/oportunidades/123')
      .expect(200)
      .expect({ deleted: true });
  });

  it('/oportunidades/importar-manual (POST)', () => {
    return request(app.getHttpServer())
      .post('/oportunidades/importar-manual')
      .send({ linkOuControle: '123' })
      .expect(201)
      .expect({ imported: true });
  });
});
