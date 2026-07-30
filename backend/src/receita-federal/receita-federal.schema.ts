import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EmpresaDataLakeDocument = EmpresaDataLake & Document;

@Schema({ timestamps: true })
export class EmpresaDataLake {
  @Prop({ required: true, unique: true, index: true }) // Indexado e único (O CNPJ completo)
  cnpj: string;

  @Prop({ required: true, index: true }) // cnpj_basico para facilitar o join com a tabela Empresas
  cnpj_basico: string;

  @Prop()
  razao_social?: string; // Vem da tabela Empresas (Passo 1.5)

  @Prop()
  capital_social?: number; // Vem da tabela Empresas (Passo 1.5)

  @Prop({ required: true, index: true })
  cnae_principal: string; // Vem da tabela Estabelecimentos (Passo 1)

  @Prop()
  cnae_descricao?: string; // Vem da tabela Cnaes (Passo 1.6)

  @Prop({ required: true })
  situacao_cadastral: string; // Ex: '02' para ATIVA (Passo 1)

  @Prop({ required: true, index: true })
  uf: string; // Ex: 'CE' (Passo 1)

  @Prop({ required: true, index: true })
  municipio: string; // Código ou Nome do Município (Passo 1)

  @Prop()
  cep?: string; // (Passo 1)

  @Prop()
  telefone?: string; // (Passo 1)

  @Prop()
  email?: string; // (Passo 1)

  @Prop()
  logradouro?: string; // (Passo 1)

  @Prop()
  numero?: string; // (Passo 1)

  @Prop()
  complemento?: string; // (Passo 1)

  @Prop()
  bairro?: string; // (Passo 1)
}

export const EmpresaDataLakeSchema =
  SchemaFactory.createForClass(EmpresaDataLake);

// Índices compostos para buscas ultra-rápidas no robô web
EmpresaDataLakeSchema.index({ uf: 1, cnae_principal: 1 });
EmpresaDataLakeSchema.index({ uf: 1, municipio: 1, cnae_principal: 1 });
