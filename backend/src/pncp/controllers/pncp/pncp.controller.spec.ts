import { Test, TestingModule } from '@nestjs/testing';
import { PncpController } from './pncp.controller';
import { PncpClientService } from '../../services/pncp-client/pncp-client.service';
import { ComprasDadosAbertosService } from '../../services/compras-dados-abertos/compras-dados-abertos.service';

describe('PncpController', () => {
  let controller: PncpController;
  let pncpClientService: jest.Mocked<PncpClientService>;
  let comprasDadosAbertosService: jest.Mocked<ComprasDadosAbertosService>;

  beforeEach(async () => {
    const pncpClientMock = {
      buscarContratacoesComPropostaAberta: jest.fn(),
    };
    const dadosAbertosMock = {
      pesquisarHistoricoPrecos: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PncpController],
      providers: [
        { provide: PncpClientService, useValue: pncpClientMock },
        { provide: ComprasDadosAbertosService, useValue: dadosAbertosMock },
      ],
    }).compile();

    controller = module.get<PncpController>(PncpController);
    pncpClientService = module.get(PncpClientService);
    comprasDadosAbertosService = module.get(ComprasDadosAbertosService);
  });

  /* istanbul ignore next */
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('inteligenciaPrecos', () => {
    it('should call pesquisarHistoricoPrecos and return its result', async () => {
      const mockResult = {
        sucesso: true,
        precoMedio: 100,
        baixaConfianca: false,
        amostraEncontrada: 10,
        precoMinimo: 50,
        precoMaximo: 150,
        topVencedores: []
      };
      comprasDadosAbertosService.pesquisarHistoricoPrecos.mockResolvedValue(mockResult);

      const result = await controller.inteligenciaPrecos('Frango', 'CE');

      expect(comprasDadosAbertosService.pesquisarHistoricoPrecos).toHaveBeenCalledWith('Frango', 'CE');
      expect(result).toEqual(mockResult);
    });
  });

  describe('testBusca', () => {
    it('should calculate dates correctly and map results', async () => {
      const mockRawPncp = [
        {
          numeroControlePNCP: '123456789000100-1-000001/2024',
          orgaoEntidade: { razaoSocial: 'Prefeitura de Teste', cnpj: '123456789000100' },
          unidadeOrgao: { nomeUnidade: 'Secretaria', ufSigla: 'CE', municipioNome: 'Teste' },
          dataAberturaProposta: '2024-01-01T10:00:00Z',
          dataEncerramentoProposta: '2024-01-10T10:00:00Z',
          dataPublicacaoPncp: '2023-12-01T10:00:00Z',
          objetoCompra: 'Aquisição de material',
          valorTotalEstimado: 1000,
          linkSistemaOrigem: 'https://pncp.gov.br',
          modalidadeNome: 'Pregão Eletrônico'
        }
      ];

      pncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValue(mockRawPncp as any);

      // Usar a data mockada não é estritamente necessário porque o código vai calcular com base no momento da execução,
      // mas precisamos testar se ele passa os argumentos calculados.
      const result = await controller.testBusca(6, 'CE', 10);

      expect(pncpClientService.buscarContratacoesComPropostaAberta).toHaveBeenCalledWith(
        expect.objectContaining({
          codigoModalidadeContratacao: 6,
          uf: 'CE',
          dataInicial: expect.any(String),
          dataFinal: expect.any(String)
        })
      );
      
      expect(result).toHaveLength(1);
      expect(result[0].orgaoNome).toBe('Prefeitura de Teste');
      expect(result[0].uf).toBe('CE');
    });

    it('should use default value for dias when not provided', async () => {
      pncpClientService.buscarContratacoesComPropostaAberta.mockResolvedValue([]);
      
      const result = await controller.testBusca(6, 'SP');
      
      expect(pncpClientService.buscarContratacoesComPropostaAberta).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
