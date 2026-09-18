import { Test, TestingModule } from '@nestjs/testing';
import { ReceitaFederalModule } from './receita-federal.module';
import { ReceitaFederalService } from './receita-federal.service';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('ReceitaFederalModule', () => {
  let module: TestingModule;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        ReceitaFederalModule,
      ],
    }).compile();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
  });

  it('should compile the module', () => {
    expect(module).toBeDefined();
  });

  it('should provide ReceitaFederalService', () => {
    const service = module.get<ReceitaFederalService>(ReceitaFederalService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ReceitaFederalService);
  });
});
