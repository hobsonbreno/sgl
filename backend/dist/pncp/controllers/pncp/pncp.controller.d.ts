import { PncpClientService } from '../../services/pncp-client/pncp-client.service';
import { ComprasDadosAbertosService } from '../../services/compras-dados-abertos/compras-dados-abertos.service';
import { OportunidadeDto } from '../../dtos/pncp.dto';
export declare class PncpController {
    private readonly pncpClientService;
    private readonly comprasDadosAbertosService;
    constructor(pncpClientService: PncpClientService, comprasDadosAbertosService: ComprasDadosAbertosService);
    inteligenciaPrecos(keyword: string, uf: string): Promise<any>;
    testBusca(modalidade: number, uf?: string, dias?: number): Promise<OportunidadeDto[]>;
}
