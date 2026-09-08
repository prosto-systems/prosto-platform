import type {
  IModuleValidationStrategyInput,
  ModuleValidationResultType,
} from '../interfaces/index.js';
import {
  type IPlatformModuleCompatibilityValidator,
  PlatformModuleCompatibilityValidator,
} from '@prosto/platform-sdk/platform';
import { RuntimeErrorCodes } from '@/common/index.js';
import { ModuleValidationBaseStrategy } from './module-validation.base-strategy.js';

/**
 * @alpha
 * Adapts the SDK compatibility validator to the core bootstrap strategy.
 *
 * The default validator checks the runtime SDK version and, when requested by
 * the manifest, the Node.js version. Validation issues are mapped to a single
 * structured `COMPATIBILITY_MISMATCH` bootstrap failure.
 */
export class CompatibilityValidationStrategy extends ModuleValidationBaseStrategy {
  readonly name = 'compatibility' as const;

  constructor(
    private readonly _validator: IPlatformModuleCompatibilityValidator = new PlatformModuleCompatibilityValidator(),
  ) {
    super();
  }

  override validate(
    input: IModuleValidationStrategyInput,
  ): ModuleValidationResultType {
    const result = this._validator.validate(
      input.artifact.moduleEnvelope.toManifest(),
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
      remediationHint:
        'Adjust module sdkVersion/nodeVersion ranges or runtime versions to satisfy compatibility constraints.',
    });
  }
}
