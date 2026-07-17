import { Test, TestingModule } from '@nestjs/testing';
import { PncpController } from './pncp.controller';

describe('PncpController', () => {
  let controller: PncpController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PncpController],
    }).compile();

    controller = module.get<PncpController>(PncpController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
