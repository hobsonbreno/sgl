import { ApiProperty } from '@nestjs/swagger';

export class OrgaoEntidadeRawDto {
  @ApiProperty()
  cnpj: string;

  @ApiProperty()
  razaoSocial: string;
}

export class UnidadeOrgaoRawDto {
  @ApiProperty()
  ufSigla: string;

  @ApiProperty()
  municipioNome: string;
}

export class PncpContratacaoRawDto {
  @ApiProperty()
  numeroControlePNCP: string;

  @ApiProperty({ required: false })
  dataEncerramentoProposta?: string;

  @ApiProperty({ required: false })
  dataAberturaProposta?: string;

  @ApiProperty({ required: false })
  valorTotalEstimado?: number;

  @ApiProperty({ type: OrgaoEntidadeRawDto, required: false })
  orgaoEntidade?: OrgaoEntidadeRawDto;

  @ApiProperty({ type: UnidadeOrgaoRawDto, required: false })
  unidadeOrgao?: UnidadeOrgaoRawDto;

  @ApiProperty({ required: false })
  modalidadeId?: number;

  @ApiProperty({ required: false })
  modalidadeNome?: string;

  @ApiProperty({ required: false })
  situacaoCompraNome?: string;

  @ApiProperty({ required: false })
  objetoCompra?: string;

  @ApiProperty({ required: false })
  linkSistemaOrigem?: string;
}

export class OportunidadeDto {
  @ApiProperty()
  numeroControlePNCP: string;
  
  @ApiProperty()
  tipo: 'licitacao' | 'dispensa';
  
  @ApiProperty()
  modalidadeCodigo: number;
  
  @ApiProperty()
  modalidadeNome: string;
  
  @ApiProperty()
  orgaoCnpj: string;
  
  @ApiProperty()
  orgaoNome: string;
  
  @ApiProperty()
  uf: string;
  
  @ApiProperty()
  municipio: string;
  
  @ApiProperty()
  objetoCompra: string;
  
  @ApiProperty()
  valorTotalEstimado: number;
  
  @ApiProperty({ required: false })
  dataAberturaProposta?: Date;
  
  @ApiProperty({ required: false })
  dataEncerramentoProposta?: Date;
  
  @ApiProperty()
  linkSistemaOrigem: string;
  
  @ApiProperty()
  situacaoCompraNome: string;
  
  @ApiProperty()
  kanbanStatus: string;
}

export function mapPncpParaOportunidade(raw: PncpContratacaoRawDto): OportunidadeDto {
  const isDispensa = raw.modalidadeId === 8 || raw.modalidadeId === 9;
  return {
    numeroControlePNCP: raw.numeroControlePNCP,
    tipo: isDispensa ? 'dispensa' : 'licitacao',
    modalidadeCodigo: raw.modalidadeId || 0,
    modalidadeNome: raw.modalidadeNome || '',
    orgaoCnpj: raw.orgaoEntidade?.cnpj || '',
    orgaoNome: raw.orgaoEntidade?.razaoSocial || '',
    uf: raw.unidadeOrgao?.ufSigla || '',
    municipio: raw.unidadeOrgao?.municipioNome || '',
    objetoCompra: raw.objetoCompra || '',
    valorTotalEstimado: raw.valorTotalEstimado || 0,
    dataAberturaProposta: raw.dataAberturaProposta ? new Date(raw.dataAberturaProposta) : undefined,
    dataEncerramentoProposta: raw.dataEncerramentoProposta ? new Date(raw.dataEncerramentoProposta) : undefined,
    linkSistemaOrigem: raw.linkSistemaOrigem || '',
    situacaoCompraNome: raw.situacaoCompraNome || '',
    kanbanStatus: 'A_FAZER'
  };
}
