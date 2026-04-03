import { describe, it } from 'vitest';

import { createModuleContractTests } from '@prosto/platform-contract-tests';
import { HealthModule } from '../src/index.js';

describe('HealthModule contract', () => {
  createModuleContractTests(
    { module: new HealthModule() },
    { describe, it },
  );
});
