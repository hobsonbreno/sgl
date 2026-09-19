import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Patch,
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { PerfilBuscaService } from './perfil-busca.service';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<any, string> {
  transform(value: any): string {
    const validObjectId = Types.ObjectId.isValid(value);
    // Types.ObjectId.isValid('2301505') will return true unfortunately for any 12 byte string, 
    // but 2301505 is 7 bytes, so it will return false. Actually, to be safe, check if it's 24 hex characters.
    if (!validObjectId || !/^[0-9a-fA-F]{24}$/.test(value)) {
      throw new BadRequestException('Formato de ID inválido. Apenas ObjectId do MongoDB é permitido.');
    }
    return value;
  }
}

export class CreatePerfilDto {
  @ApiProperty()
  nome: string;

  @ApiProperty({ required: false, type: [String] })
  ufs?: string[];

  @ApiProperty({ required: false, type: [String] })
  municipiosIbge?: string[];

  @ApiProperty({ required: false, type: [String] })
  orgaosCnpj?: string[];

  @ApiProperty({ required: false, type: [String] })
  unidadesUasg?: string[];

  @ApiProperty({ type: [Number] })
  modalidades: number[];

  @ApiProperty({ required: false, type: [String] })
  palavrasChave?: string[];

  @ApiProperty({ required: false, type: [String] })
  nichosFornecedores?: string[];

  @ApiProperty({ required: false, default: true })
  ativo?: boolean;

  @ApiProperty({ required: false, type: [String] })
  estadosBuscaFornecedores?: string[];

  @ApiProperty({ required: false, type: [String] })
  municipiosBuscaFornecedores?: string[];
}

@ApiTags('Perfis de Busca')
@Controller('perfis-busca')
export class PerfilBuscaController {
  constructor(private readonly service: PerfilBuscaService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um perfil de busca' })
  create(@Body() data: CreatePerfilDto) {
    return this.service.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os perfis' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter um perfil' })
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar um perfil' })
  update(@Param('id', ParseObjectIdPipe) id: string, @Body() data: CreatePerfilDto) {
    return this.service.update(id, data);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Ativar/Desativar um perfil rapidamente' })
  toggle(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.toggleActive(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deletar um perfil' })
  remove(@Param('id', ParseObjectIdPipe) id: string) {
    return this.service.remove(id);
  }
}
