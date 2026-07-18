import { Controller, Get, Query } from '@nestjs/common';
import { OrgaoService } from './orgao.service';

@Controller('orgao')
export class OrgaoController {
  constructor(private readonly service: OrgaoService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.service.findAll(query);
  }
}
