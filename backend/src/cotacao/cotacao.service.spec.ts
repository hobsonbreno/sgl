import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { CotacaoService } from './cotacao.service';
import { Cotacao } from './cotacao.schema';
import { FornecedorService } from '../fornecedor/fornecedor.service';
import { SupplierDiscoveryService } from '../fornecedor/supplier-discovery.service';
import { CotacaoGateway } from './cotacao.gateway';

describe('CotacaoService', () => {
  let service: CotacaoService;
  let mockModel: any;
  let mockFornecedorService: any;
  let mockConnection: any;
  let mockGateway: any;

  beforeEach(async () => {
    mockModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
    };
    mockFornecedorService = {
      findOne: jest.fn(),
      registrarHistoricoPreco: jest.fn(),
      updateProdutoBase: jest.fn(),
      removerHistoricoPreco: jest.fn(),
    };
    mockConnection = {
      collection: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        updateOne: jest.fn(),
      }),
    };
    mockGateway = {
      emitCotacaoUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CotacaoService,
        { provide: getModelToken(Cotacao.name), useValue: mockModel },
        { provide: FornecedorService, useValue: mockFornecedorService },
        { provide: SupplierDiscoveryService, useValue: { discoverSuppliersForProduct: jest.fn() } },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: CotacaoGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<CotacaoService>(CotacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate reajuste metrics, record historicoNegociacao, and sync to FornecedorService and ProdutoBase on updatePreco', async () => {
    const cotacaoId = new mongoose.Types.ObjectId().toString();
    const itemId = new mongoose.Types.ObjectId().toString();
    const fornecedorId = new mongoose.Types.ObjectId().toString();
    const oportunidadeId = new mongoose.Types.ObjectId();
    const produtoId = new mongoose.Types.ObjectId();

    const mockCotacaoDoc: any = {
      _id: cotacaoId,
      oportunidadeId,
      itens: [
        {
          _id: new mongoose.Types.ObjectId(itemId),
          produtoId,
          numeroItem: 1,
          descricaoItem: 'CADEIRA GIRATORIA ERGONOMICA',
          quantidade: 10,
          precosFornecedores: [
            {
              fornecedorId: new mongoose.Types.ObjectId(fornecedorId),
              precoUnitario: 100,
              precoCustoContrato: 100,
              valorFechadoOrgao: 150,
              historicoNegociacao: [],
            },
          ],
        },
      ],
      save: jest.fn().mockResolvedValue(true),
    };

    mockModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockCotacaoDoc),
      populate: jest.fn().mockReturnThis(),
    });

    const opCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: oportunidadeId,
        orgaoNome: 'MARINHA DO BRASIL',
        unidadeCompradora: '783601',
        modalidadeNome: 'Pregão Eletrônico',
        numeroCompraOrigem: '51',
        anoCompraOrigem: '2026',
        kanbanStatus: 'FAZENDO',
      }),
      updateOne: jest.fn().mockResolvedValue(true),
    };
    const prodCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: produtoId,
        valorVencedor: 150,
      }),
      updateOne: jest.fn().mockResolvedValue(true),
    };

    mockConnection.collection.mockImplementation((name: string) => {
      if (name === 'oportunidades') return opCollection;
      if (name === 'produtos') return prodCollection;
      return { findOne: jest.fn(), updateOne: jest.fn() };
    });

    mockFornecedorService.findOne.mockResolvedValue({
      _id: fornecedorId,
      razaoSocial: 'FORNECEDOR TESTE LTDA',
      cnpj: '12.345.678/0001-90',
    });

    jest.spyOn(service, 'findOne').mockResolvedValue(mockCotacaoDoc);

    await service.updatePreco(cotacaoId, itemId, {
      fornecedorId,
      precoUnitario: 170, // Aumento de 100 para 170 (acima de 150 fechado com órgão)
      precoCustoContrato: 100,
      valorFechadoOrgao: 150,
      valorOfertadoOrgao: 160,
      quantidadeEntregue: 4,
      dataAssinaturaContrato: '2026-01-15',
      dataUltimaAtualizacaoCusto: '2026-11-13',
      chatNegociacao: 'Fornecedor informou alta do aço.',
      registrarReajuste: true,
    });

    const pf = mockCotacaoDoc.itens[0].precosFornecedores[0];
    expect(pf.precoUnitario).toBe(170);
    expect(pf.precoCustoContrato).toBe(100);
    expect(pf.valorFechadoOrgao).toBe(150);
    expect(pf.historicoNegociacao).toHaveLength(1);

    const hist = pf.historicoNegociacao[0];
    expect(hist.tipo).toBe('REAJUSTE_MERCADO');
    expect(hist.lucroContratoUnitario).toBe(50); // 150 - 100
    expect(hist.percentualLucroContrato).toBe(50); // (50 / 100) * 100
    expect(hist.resultadoAtualUnitario).toBe(-20); // 150 - 170 (prejuízo de R$ 20)
    expect(hist.valorSugeridoReajuste).toBe(220); // 170 + 50
    expect(hist.informe).toContain('prejuízo de R$ 20,00 por unidade');

    expect(mockFornecedorService.registrarHistoricoPreco).toHaveBeenCalledWith(
      fornecedorId,
      expect.objectContaining({
        descricaoItem: 'CADEIRA GIRATORIA ERGONOMICA',
        precoUnitario: 170,
        precoCustoContrato: 100,
        valorFechadoOrgao: 150,
        lucroContratoUnitario: 50,
        resultadoAtualUnitario: -20,
        valorSugeridoReajuste: 220,
      }),
    );

    expect(mockFornecedorService.updateProdutoBase).toHaveBeenCalledWith(
      'CADEIRA GIRATORIA ERGONOMICA',
      expect.objectContaining({
        precoCustoContrato: 100,
        precoCustoAtual: 170,
        valorFechadoOrgao: 150,
        fornecedorNome: 'FORNECEDOR TESTE LTDA',
        registrarNoHistorico: true,
      }),
    );
  });
});
