import { Test, TestingModule } from '@nestjs/testing';
import { CotacaoController } from './cotacao.controller';
import { CotacaoService } from './cotacao.service';

describe('CotacaoController', () => {
  let controller: CotacaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CotacaoController],
      providers: [
        {
          provide: CotacaoService,
          useValue: {
            createOrGet: jest.fn(),
            findByOportunidade: jest.fn(),
            findByOportunidades: jest.fn(),
            findOne: jest.fn(),
            updatePreco: jest.fn(),
            removePreco: jest.fn(),
            buscarPrecosWebAuto: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CotacaoController>(CotacaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
