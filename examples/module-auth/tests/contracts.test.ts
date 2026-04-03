import { describe, it } from 'vitest';

import { createModuleContractTests } from '@prosto/platform-contract-tests';
import { AuthModule } from '../src/index.js';

describe('AuthModule contract', () => {
  createModuleContractTests(
    { module: new AuthModule() },
    { describe, it },
  );
});
