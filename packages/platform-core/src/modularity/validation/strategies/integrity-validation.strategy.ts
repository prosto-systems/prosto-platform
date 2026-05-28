import type {
  IModuleValidationStrategyInput,
  ModuleValidationResultType,
} from '../interfaces/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';
import {
  ModuleValidationBaseStrategy,
} from './module-validation.base-strategy.js';

/**
 * @alpha
 * Integrity validation strategy.
 * Validates that module artifacts have proper integrity evidence (checksum or signature).
 */
export class IntegrityValidationStrategy extends ModuleValidationBaseStrategy {
  readonly name = 'integrity' as const;

  override validate(
    input: IModuleValidationStrategyInput,
  ): ModuleValidationResultType {
    const { checksum, signature } = input.artifact.module.manifest;

    if (!checksum && !signature) {
      return this.failure({
        errorCode: RuntimeErrorCodes.IntegrityCheckFailed,
        message: `Module ${input.artifact.moduleId} has no integrity evidence: neither checksum nor signature is present in manifest.`,
        remediationHint: 'Provide checksum and/or signature for module artifact integrity evidence.',
      });
    }

    // TODO: Implement integrity validation logic using checksum
    //  and/or signature verification against the module artifact.

    return this.success();
  }
}
