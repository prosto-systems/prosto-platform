import type {
  IModuleValidationStrategyInput,
  ModuleValidationResultType,
} from '../interfaces/index.js';
import { RuntimeErrorCodes } from '@/common/index.js';
import { IntegrityVerifier } from '@/security/index.js';
import { ModuleValidationBaseStrategy } from './module-validation.base-strategy.js';

/**
 * @alpha
 * Integrity validation strategy.
 * Validates that module artifacts have proper integrity evidence (checksum or signature).
 */
export class IntegrityValidationStrategy extends ModuleValidationBaseStrategy {
  readonly name = 'integrity' as const;

  constructor(
    private readonly _verifier: IntegrityVerifier = new IntegrityVerifier(),
  ) {
    super();
  }

  override validate(
    input: IModuleValidationStrategyInput,
  ): ModuleValidationResultType {
    const { checksum, signature } = input.artifact.module.manifest;

    if (!checksum && !signature) {
      return this.failure({
        errorCode: RuntimeErrorCodes.IntegrityCheckFailed,
        message: `Module ${input.artifact.moduleId} has no integrity evidence: neither checksum nor signature is present in manifest.`,
        remediationHint:
          'Provide checksum and/or signature for module artifact integrity evidence.',
      });
    }

    // Note: Full payload verification is performed at the source loader level
    // (PathSource, UrlSource, RegistrySource) during artifact fetch.
    // This strategy validates that integrity metadata is present and properly formatted.

    // Validate checksum format if present
    if (checksum) {
      const parsed = this._verifier.parseChecksum(checksum);

      if (!parsed) {
        return this.failure({
          errorCode: RuntimeErrorCodes.IntegrityCheckFailed,
          message: `Module ${input.artifact.moduleId} has invalid checksum format: "${checksum}".`,
          remediationHint:
            'Use sha256:<hex> or sha256-<base64> format for checksum.',
        });
      }
    }

    // If signature is present without checksum, verify signature format
    if (signature && !checksum) {
      // Basic signature format validation (non-empty base64)
      if (!signature.trim() || !/^[A-Za-z0-9+/]+=*$/.test(signature)) {
        return this.failure({
          errorCode: RuntimeErrorCodes.IntegrityCheckFailed,
          message: `Module ${input.artifact.moduleId} has invalid signature format.`,
          remediationHint: 'Signature must be a valid base64-encoded string.',
        });
      }
    }

    return this.success();
  }
}
