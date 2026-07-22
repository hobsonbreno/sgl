import { HttpService } from '@nestjs/axios';
import { PncpContratacaoRawDto } from '../../dtos/pncp.dto';
export interface FiltroBuscaDto {
    dataInicial: string;
    dataFinal: string;
    codigoModalidadeContratacao: number;
    uf?: string;
    codigoMunicipioIbge?: string;
    cnpj?: string;
    codigoUnidadeAdministrativa?: string;
}
export declare class PncpClientService {
    private readonly httpService;
    private readonly logger;
    private readonly baseUrl;
    constructor(httpService: HttpService);
    buscarContratacoesComPropostaAberta(filtros: FiltroBuscaDto): Promise<PncpContratacaoRawDto[]>;
    buscarItensDaContratacao(numeroControlePNCP: string): Promise<any[]>;
    private fazerRequisicaoComRetry;
}
