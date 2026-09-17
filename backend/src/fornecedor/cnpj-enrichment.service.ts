import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class CnpjEnrichmentService {
  private readonly logger = new Logger(CnpjEnrichmentService.name);

  async enrichCnpj(cnpj: string): Promise<any> {
    try {
      const cleanCnpj = cnpj.replace(/\D/g, '');
      if (cleanCnpj.length !== 14) return null;

      this.logger.log(`Consultando BrasilAPI para CNPJ: ${cleanCnpj}`);
      const res = await axios.get(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            Accept: 'application/json',
          },
        },
      );
      return res.data;
    } catch (e) {
      this.logger.warn(
        `Erro ao consultar BrasilAPI para CNPJ ${cnpj}: ${e.message}`,
      );
      return null;
    }
  }
}
