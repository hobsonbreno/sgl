import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { FornecedorService } from './fornecedor.service';
import { Fornecedor, ProdutoBase } from './fornecedor.schema';
import { FornecedorGateway } from './fornecedor.gateway';

describe('FornecedorService', () => {
  let service: FornecedorService;
  let mockFornecedorModel: any;
  let mockIntelModel: any;
  let mockConnection: any;
  let mockGateway: any;

  beforeEach(async () => {
    mockFornecedorModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      create: jest.fn(),
    };

    mockIntelModel = jest.fn().mockImplementation((dto) => ({
      ...dto,
      save: jest.fn().mockImplementation(function () {
        return Promise.resolve(this);
      }),
    }));
    mockIntelModel.find = jest.fn();
    mockIntelModel.findOne = jest.fn();
    mockIntelModel.deleteOne = jest.fn();

    mockConnection = {
      collection: jest.fn(),
    };
    mockGateway = {
      emitFornecedorUpdate: jest.fn(),
      emitFornecedorDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FornecedorService,
        { provide: getModelToken(Fornecedor.name), useValue: mockFornecedorModel },
        { provide: getModelToken(ProdutoBase.name), useValue: mockIntelModel },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: FornecedorGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<FornecedorService>(FornecedorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should updateProdutoBase and calculate reajuste history accurately', async () => {
    mockIntelModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const result = await service.updateProdutoBase('NOTEBOOK CORPORATIVO I7', {
      precoCustoContrato: 3000,
      precoCustoAtual: 3800,
      valorOfertadoOrgao: 4200,
      valorFechadoOrgao: 3600,
      dataAssinaturaContrato: '2026-02-01',
      dataUltimoReajuste: '2026-11-13',
      orgaoNome: 'ESCOLA DE APRENDIZES MARINHEIROS',
      uasg: '783601',
      pregaoNumero: 'PE 51/2026',
      numeroItem: 5,
      quantidadeContratada: 20,
      quantidadeEntregue: 5,
      fornecedorNome: 'TECH DISTRIBUIDORA LTDA',
      fornecedorCnpj: '11.222.333/0001-44',
      chatNegociacao: 'Aumento do dólar nos componentes importados.',
      registrarNoHistorico: true,
    });

    expect(result.precoCustoContrato).toBe(3000);
    expect(result.precoCustoAtual).toBe(3800);
    expect(result.valorFechadoOrgao).toBe(3600);
    expect(result.nossoLanceOficial).toBe(3600);
    expect(result.historicoReajustes).toHaveLength(1);

    const hist = result.historicoReajustes[0];
    expect(hist.tipo).toBe('REAJUSTE_MERCADO');
    expect(hist.lucroContratoUnitario).toBe(600); // 3600 - 3000
    expect(hist.percentualLucroContrato).toBe(20); // 600 / 3000 * 100
    expect(hist.resultadoAtualUnitario).toBe(-200); // 3600 - 3800
    expect(hist.valorSugeridoReajuste).toBe(4400); // 3800 + 600
    expect(hist.informe).toContain('prejuízo de R$ 200,00 por unidade');
    expect(mockGateway.emitFornecedorUpdate).toHaveBeenCalled();
  });

  it('should include products registered directly in ProdutoBase when calling getBaseProdutos', async () => {
    mockFornecedorModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    const intelDoc = {
      descricaoItem: 'PRODUTO DIRETO NA BASE',
      precoCustoContrato: 50,
      precoCustoAtual: 75,
      valorFechadoOrgao: 65,
      orgaoNome: 'ORGAO TESTE',
      historicoReajustes: [
        {
          data: new Date('2026-11-13'),
          tipo: 'REAJUSTE_MERCADO',
          precoCustoContrato: 50,
          precoCustoAtual: 75,
          valorFechadoOrgao: 65,
          lucroContratoUnitario: 15,
          percentualLucroContrato: 30,
          resultadoAtualUnitario: -10,
          valorSugeridoReajuste: 90,
        },
      ],
    };

    mockIntelModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([intelDoc]),
    });

    const res = await service.getBaseProdutos({ page: 1, limit: 10 });
    expect(res.total).toBe(1);
    expect(res.data[0].descricaoItem).toBe('PRODUTO DIRETO NA BASE');
    expect(res.data[0].precoCustoContrato).toBe(50);
    expect(res.data[0].precoCustoAtual).toBe(75);
    expect(res.data[0].valorFechadoOrgao).toBe(65);
    expect(res.data[0].historicoReajustes).toHaveLength(1);
  });
});
