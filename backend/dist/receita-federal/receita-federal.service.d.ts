import { Model } from 'mongoose';
import { EmpresaDataLakeDocument } from './receita-federal.schema';
export declare class ReceitaFederalService {
    private readonly empresaDataLakeModel;
    private readonly logger;
    constructor(empresaDataLakeModel: Model<EmpresaDataLakeDocument>);
    runETLPipeline(): Promise<void>;
    private loadDicionario;
    private processEstabelecimentos;
    private processEmpresas;
}
