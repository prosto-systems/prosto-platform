import { z } from 'zod';
import {
  MODULE_CAPABILITY_PATTERN,
  MODULE_CRITICALITY_LEVELS,
  MODULE_ID_PATTERN,
  MODULE_SECURITY_CLASSES,
} from '../constants/index.js';
import { isSemverRange, isSemverVersion } from '../utils/index.js';

/**
 * @stable
 * Zod schema for semver version.
 */
export const SemverVersionSchema = z.string().refine(isSemverVersion, {
  message: 'Value must be a valid semver version.',
});

/**
 * @stable
 * Zod schema for semver range.
 */
export const SemverRangeSchema = z.string().refine(isSemverRange, {
  message: 'Value must be a valid semver range.',
});

/**
 * @stable
 * Zod schema for module capability declarations.
 */
export const CapabilitySchema = z.string().regex(MODULE_CAPABILITY_PATTERN, {
  message: 'Capability must use dot-separated lowercase segments.',
});

/**
 * @stable
 * Zod schema for module dependency declarations.
 */
export const ModuleDependencySchema = z
  .object({
    id: z.string().regex(MODULE_ID_PATTERN, {
      message: 'Dependency id must match module id pattern.',
    }),
    version: SemverRangeSchema,
    optional: z.boolean().optional(),
  })
  .strict();

/**
 * @stable
 * Zod schema for platform module manifests.
 */
export const PlatformModuleManifestSchema = z
  .object({
    id: z.string().regex(MODULE_ID_PATTERN, {
      message: 'Module id must match module id pattern.',
    }),
    version: SemverVersionSchema,
    sdkVersion: SemverRangeSchema,
    nodeVersion: SemverRangeSchema.optional(),
    criticality: z.enum(MODULE_CRITICALITY_LEVELS),
    securityClass: z.enum(MODULE_SECURITY_CLASSES),
    capabilities: z.array(CapabilitySchema).min(1),
    dependencies: z.array(ModuleDependencySchema).default([]),
    checksum: z.string().regex(/^sha256:[a-f0-9]{64}$/).optional(),
    signature: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .strict();

/**
 * @stable
 * Runtime input type accepted by manifest schema validation.
 */
export type PlatformModuleManifestInputType = z.input<typeof PlatformModuleManifestSchema>;

/**
 * @stable
 * Runtime output type produced by manifest schema validation.
 */
export type PlatformModuleManifestOutputType = z.output<typeof PlatformModuleManifestSchema>;
