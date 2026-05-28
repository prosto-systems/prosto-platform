import type {
  IConfigAccessEvaluationInput,
  IConfigAccessPolicy,
  IConfigAccessPolicyEvaluator,
} from '@/modularity/index.js';
import { ConfigAccessPolicyEvaluator } from '@/modularity/index.js';
import type {
  IModuleValidationStrategyInput,
  ModuleValidationResultType,
} from '../interfaces/index.js';
import type { IPlatformConfig } from '@/runtime/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';
import {
  ModuleValidationBaseStrategy,
} from './module-validation.base-strategy.js';

/**
 * @alpha
 * Validation strategy that enforces configuration access policy.
 * Evaluates module config capabilities against policy rules before
 * the module is allowed to proceed in the bootstrap pipeline.
 */
export class ConfigAccessValidationStrategy extends ModuleValidationBaseStrategy {
  readonly name = 'configAccess' as const;

  private readonly _policy: IConfigAccessPolicy;

  constructor(
    private readonly _config: IPlatformConfig,
    private readonly _isProduction: boolean,
    private readonly _policyEvaluator: IConfigAccessPolicyEvaluator = new ConfigAccessPolicyEvaluator(),
  ) {
    super();

    this._policy = _config.modules?.configAccessPolicy ?? this._createDefaultPolicy();
  }

  validate(input: IModuleValidationStrategyInput): ModuleValidationResultType {
    const { manifest } = input.artifact.module;
    const configCapabilities = manifest.capabilities
      .filter((capability) => capability.startsWith('config.'));

    // If module has no config capabilities, allow it to proceed
    if (!configCapabilities.length) {
      return this.success();
    }

    // Build evaluation input
    const evalInput: IConfigAccessEvaluationInput = {
      configCapabilities,
      moduleId: manifest.id,
      securityClass: manifest.securityClass,
      isProduction: this._isProduction,
    };

    // Evaluate access
    const result = this._policyEvaluator.evaluate(
      evalInput,
      this._policy,
      this._config,
    );

    if (!result.granted) {
      return this.failure({
        errorCode: result.denialCode ?? RuntimeErrorCodes.ConfigAccessDenied,
        message: result.reason,
        remediationHint: result.remediationHint ?? 'Review module configCapabilities and runtime policy configuration.',
      });
    }

    return this.success();
  }

  private _createDefaultPolicy(): IConfigAccessPolicy {
    return {
      sectionAllowlistBySecurityClass: {
        trusted: [],
        internal: [],
        'third-party-reviewed': [],
      },
      productionStrictMode: true,
      denyOnUnknownCapability: true,
    };
  }
}
