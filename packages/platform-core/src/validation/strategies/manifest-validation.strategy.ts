import type {
  IModuleValidationStrategyInput,
  ModuleValidationResultType,
} from '../interfaces/index.js';
import {
  type IModuleManifestValidator,
  PlatformModuleManifestValidator,
} from '@prosto/platform-sdk';
import { RuntimeReasonCodes } from '@/runtime/index.js';
import {
  ModuleValidationBaseStrategy,
} from './module-validation.base-strategy.js';

/**
 * @alpha
 * Manifest validation strategy.
 * Wraps IModuleManifestValidator from SDK
 * to provide pluggable manifest validation.
 */
export class ManifestValidationStrategy extends ModuleValidationBaseStrategy {
  readonly name = 'manifest' as const;

  constructor(
    private readonly _validator: IModuleManifestValidator = new PlatformModuleManifestValidator(),
  ) {
    super();
  }

  override validate(
    input: IModuleValidationStrategyInput,
  ): ModuleValidationResultType {
    const result = this._validator.validate(input.artifact.module.manifest);

    if (result.success === true) {
      return this.success();
    }

    return this.failure({
      errorCode: RuntimeReasonCodes.ManifestInvalid,
      message: `Manifest validation failed for module ${input.artifact.moduleId}: ${result.error.message}`,
      remediationHint: 'Fix module manifest according to @prosto/platform-sdk schema and semantic rules.',
    });
  }
}
