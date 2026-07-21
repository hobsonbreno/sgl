import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';

@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.financeiroService.create(createDto);
  }

  @Get()
  findAll() {
    return this.financeiroService.findAll();
  }

  @Get('resumo')
  findResumo() {
    return this.financeiroService.findResumo();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.financeiroService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.financeiroService.remove(id);
  }
}
