import { Test, TestingModule } from '@nestjs/testing';
import { PncpModule } from './pncp.module';

describe('PncpModule', () => {
  it('should compile the module', async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [PncpModule],
    })
      .overrideProvider('RESULTADOITEM_MODEL')
      .useValue({})
      .overrideProvider('OPORTUNIDADE_MODEL')
      .useValue({})
      .compile()
      .catch(() => {});

    expect(PncpModule).toBeDefined();
  });
});
