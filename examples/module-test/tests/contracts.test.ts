import { describe, it } from 'vitest';
import { createPlatformModuleContractTests } from '@prosto/platform-contract-tests';
import { PlatformModule } from '@/platform/platform.module.js';
import manifest from '../manifest.json';

describe('Test module contract', () => {
  createPlatformModuleContractTests(
    { manifest, module: new PlatformModule() },
    { describe, it },
  );
});
