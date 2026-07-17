import { Controller, Get, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OportunidadeService } from './oportunidade.service';

export class UpdateStatusDto {
  kanbanStatus: string;
}

@ApiTags('Oportunidades')
@Controller('oportunidades')
export class OportunidadeController {
  constructor(private readonly service: OportunidadeService) {}

  @Get()
  @ApiOperation({ summary: 'Listar oportunidades (com paginação e filtros)' })
  @ApiQuery({ name: 'kanbanStatus', required: false })
  @ApiQuery({ name: 'uf', required: false })
  @ApiQuery({ name: 'modalidadeCodigo', required: false })
  @ApiQuery({ name: 'prazoAteEmDias', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter oportunidade por ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar o status do Kanban' })
  updateStatus(@Param('id') id: string, @Body() body: UpdateStatusDto) {
    return this.service.updateStatus(id, body.kanbanStatus);
  }
}
