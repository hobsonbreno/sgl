import { HttpService } from '@nestjs/axios';
export declare class ComprasDadosAbertosService {
    private readonly httpService;
    private readonly logger;
    private readonly baseUrl;
    constructor(httpService: HttpService);
    pesquisarHistoricoPrecos(keyword: string, uf: string): Promise<any>;
}
