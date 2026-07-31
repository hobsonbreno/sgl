import {
  IsEnum,
  IsNumber,
  Min,
  ValidateIf,
  IsNotEmpty,
  IsMongoId,
} from 'class-validator';

export enum ModeloEntrega {
  INTEGRAL = 'INTEGRAL',
  FRACIONADO = 'FRACIONADO',
}

export class SimularEstrategiaDto {
  @IsMongoId()
  oportunidadeId: string;

  @IsNumber()
  @Min(1)
  lanceTotal: number;

  @IsEnum(ModeloEntrega)
  modeloEntrega: ModeloEntrega;

  @ValidateIf((o: any) => o.modeloEntrega === ModeloEntrega.FRACIONADO)
  @IsNumber()
  @Min(2, { message: 'Contratos fracionados exigem ao menos 2 meses.' })
  @IsNotEmpty()
  mesesContrato?: number;
}
