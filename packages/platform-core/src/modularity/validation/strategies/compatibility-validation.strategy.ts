import type {
  IModuleValidationStrategyInput,
  ModuleValidationResultType,
} from '../interfaces/index.js';
import {
  type IModuleCompatibilityValidator,
  PlatformModuleCompatibilityValidator,
} from '@prosto/platform-sdk';
import { RuntimeErrorCodes } from '@/common/index.js';
import {
  ModuleValidationBaseStrategy,
} from './module-validation.base-strategy.js';

/**
 * @alpha
 * Compatibility validation strategy.
 * Wraps IModuleCompatibilityValidator from SDK
 * to provide pluggable compatibility validation.
 */
export class CompatibilityValidationStrategy extends ModuleValidationBaseStrategy {
  readonly name = 'compatibility' as const;

  constructor(
    private readonly _validator: IModuleCompatibilityValidator = new PlatformModuleCompatibilityValidator(),
  ) {
    super();
  }

  override validate(
    input: IModuleValidationStrategyInput,
  ): ModuleValidationResultType {
    const result = this._validator.validate(
      input.artifact.module.manifest,
      input.runtimeVersion,
    );

    if (result.compatible === true) {
      return this.success();
    }

    const issueMessages = result.issues.map(
      (issue) => `${issue.message.replace(/\.$/, '')} (field: ${issue.field})`,
    );

    return this.failure({
      errorCode: RuntimeErrorCodes.CompatibilityMismatch,
      message: `Compatibility validation failed for module ${input.artifact.moduleId}: ${issueMessages.join('; ')}`,
      remediationHint: 'Adjust module sdkVersion/nodeVersion ranges or runtime versions to satisfy compatibility constraints.',
    });
  }
}
