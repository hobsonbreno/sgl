import { Test, TestingModule } from '@nestjs/testing';
import { FornecedorController } from './fornecedor.controller';
import { FornecedorService } from './fornecedor.service';

describe('FornecedorController', () => {
  let controller: FornecedorController;
  let mockService: any;

  beforeEach(async () => {
    mockService = {
      create: jest.fn(),
      findAll: jest.fn(),
      getBaseProdutos: jest.fn(),
      unificarProdutosBase: jest.fn(),
      updateProdutoBase: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FornecedorController],
      providers: [
        {
          provide: FornecedorService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<FornecedorController>(FornecedorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate updateProdutoBase with full contract and reajuste payload', async () => {
    const payload = {
      descricaoItem: 'ARROZ PARBOILIZADO TIPO 1',
      precoCustoContrato: 4.5,
      precoCustoAtual: 6.2,
      valorFechadoOrgao: 5.8,
      registrarNoHistorico: true,
    };
    mockService.updateProdutoBase.mockResolvedValue({ ...payload });

    const res = await controller.updateProdutoBase(payload);
    expect(mockService.updateProdutoBase).toHaveBeenCalledWith(
      'ARROZ PARBOILIZADO TIPO 1',
      payload,
    );
    expect(res).toEqual(payload);
  });
});
