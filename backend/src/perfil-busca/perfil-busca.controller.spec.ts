import { Test, TestingModule } from '@nestjs/testing';
import { PerfilBuscaController } from './perfil-busca.controller';

describe('PerfilBuscaController', () => {
  let controller: PerfilBuscaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerfilBuscaController],
    }).compile();

    controller = module.get<PerfilBuscaController>(PerfilBuscaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
