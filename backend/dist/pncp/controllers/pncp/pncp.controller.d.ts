import { PncpClientService } from '../../services/pncp-client/pncp-client.service';
import { OportunidadeDto } from '../../dtos/pncp.dto';
export declare class PncpController {
    private readonly pncpClientService;
    constructor(pncpClientService: PncpClientService);
    testBusca(modalidade: number, uf?: string, dias?: number): Promise<OportunidadeDto[]>;
}
