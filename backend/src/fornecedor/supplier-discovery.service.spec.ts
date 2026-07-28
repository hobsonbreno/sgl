import { Test, TestingModule } from '@nestjs/testing';
import { SupplierDiscoveryService } from './supplier-discovery.service';
import { getModelToken } from '@nestjs/mongoose';
import { Fornecedor, ProdutoBase } from './fornecedor.schema';
import { PerfilBusca } from '../perfil-busca/perfil-busca.schema';
import * as axios from 'axios';

jest.mock('axios');

describe('SupplierDiscoveryService', () => {
  let service: SupplierDiscoveryService;
  
  const mockFornecedorModel = {
    findOne: jest.fn().mockReturnThis(),
    create: jest.fn(),
    exec: jest.fn(),
    db: {
      model: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      })
    }
  };

  const mockProdutoBaseModel = {};

  const mockPerfilBuscaModel = {
    findOne: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue({
      ativo: true,
      estadosBuscaFornecedores: ['CE'],
      municipiosBuscaFornecedores: ['ABAIARA']
    })
  };

  beforeEach(async () => {
    process.env.SERPAPI_KEYS = 'test-key';
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierDiscoveryService,
        {
          provide: getModelToken(Fornecedor.name),
          useValue: mockFornecedorModel,
        },
        {
          provide: getModelToken(ProdutoBase.name),
          useValue: mockProdutoBaseModel,
        },
        {
          provide: getModelToken(PerfilBusca.name),
          useValue: mockPerfilBuscaModel,
        },
      ],
    }).compile();

    service = module.get<SupplierDiscoveryService>(SupplierDiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should fallback to UF search if municipality search returns 0 results', async () => {
    const axiosGetSpy = jest.spyOn(axios, 'get');
    
    // First call (with municipality ABAIARA) returns 0 results
    axiosGetSpy.mockResolvedValueOnce({
      data: { organic_results: [] }
    });
    
    // Second call (fallback, just UF 'CE') returns 1 result
    axiosGetSpy.mockResolvedValueOnce({
      data: {
        organic_results: [
          {
            title: 'Empresa Teste LTDA - 12345678000199',
            link: 'https://cnpj.biz/12345678000199',
            snippet: 'Distribuidor atacadista de feijao'
          }
        ]
      }
    });

    // Mock create and findOne for the fallback result
    mockFornecedorModel.findOne.mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
    mockFornecedorModel.create.mockResolvedValueOnce({
      _id: '123',
      razaoSocial: 'Empresa Teste LTDA'
    });

    const results = await service.discoverSuppliersForProduct('FEIJAO CARIOCA');
    
    expect(axiosGetSpy).toHaveBeenCalledTimes(2);
    
    // Assert first call had ABAIARA
    expect(axiosGetSpy.mock.calls[0][1].params.q).toContain('ABAIARA');
    
    // Assert second call did NOT have ABAIARA
    expect(axiosGetSpy.mock.calls[1][1].params.q).not.toContain('ABAIARA');
    
    expect(results).toHaveLength(1);
    expect(results[0].razaoSocial).toBe('Empresa Teste LTDA');
  });
});
