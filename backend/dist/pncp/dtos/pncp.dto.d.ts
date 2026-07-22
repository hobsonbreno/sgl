export declare class OrgaoEntidadeRawDto {
    cnpj: string;
    razaoSocial: string;
}
export declare class UnidadeOrgaoRawDto {
    ufSigla: string;
    municipioNome: string;
    codigoUnidade?: string;
}
export declare class PncpContratacaoRawDto {
    numeroControlePNCP: string;
    dataEncerramentoProposta?: string;
    dataAberturaProposta?: string;
    valorTotalEstimado?: number;
    numeroCompra?: string;
    anoCompra?: number;
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
    unidadeCompradora?: string;
    numeroCompraOrigem?: string;
    anoCompraOrigem?: number;
    valorTotalEstimado: number;
    dataAberturaProposta?: Date;
    dataEncerramentoProposta?: Date;
    linkSistemaOrigem: string;
    situacaoCompraNome: string;
    kanbanStatus: string;
}
export declare function mapPncpParaOportunidade(raw: PncpContratacaoRawDto): OportunidadeDto;
