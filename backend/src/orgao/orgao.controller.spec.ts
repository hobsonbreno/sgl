import { Test, TestingModule } from '@nestjs/testing';
import { OrgaoController } from './orgao.controller';

describe('OrgaoController', () => {
  let controller: OrgaoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrgaoController],
    }).compile();

    controller = module.get<OrgaoController>(OrgaoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
