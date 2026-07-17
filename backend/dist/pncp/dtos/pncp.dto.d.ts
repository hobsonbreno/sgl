export declare class OrgaoEntidadeRawDto {
    cnpj: string;
    razaoSocial: string;
}
export declare class UnidadeOrgaoRawDto {
    ufSigla: string;
    municipioNome: string;
}
export declare class PncpContratacaoRawDto {
    numeroControlePNCP: string;
    dataEncerramentoProposta?: string;
    dataAberturaProposta?: string;
    valorTotalEstimado?: number;
    orgaoEntidade?: OrgaoEntidadeRawDto;
    unidadeOrgao?: UnidadeOrgaoRawDto;
    modalidadeId?: number;
    modalidadeNome?: string;
    situacaoCompraNome?: string;
    objetoCompra?: string;
    linkSistemaOrigem?: string;
}
export declare class OportunidadeDto {
    numeroControlePNCP: string;
    tipo: 'licitacao' | 'dispensa';
    modalidadeCodigo: number;
    modalidadeNome: string;
    orgaoCnpj: string;
    orgaoNome: string;
    uf: string;
    municipio: string;
    objetoCompra: string;
    valorTotalEstimado: number;
    dataAberturaProposta?: Date;
    dataEncerramentoProposta?: Date;
    linkSistemaOrigem: string;
    situacaoCompraNome: string;
    kanbanStatus: string;
}
export declare function mapPncpParaOportunidade(raw: PncpContratacaoRawDto): OportunidadeDto;
