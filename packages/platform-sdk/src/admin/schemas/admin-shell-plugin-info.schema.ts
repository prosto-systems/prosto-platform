import { z } from 'zod';
import { ADMIN_SHELL_RUNTIME_API_VERSION } from '../constants/admin-shell-runtime.constants.js';

const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

const adminShellPluginEntrySchema = z
  .object({
    type: z.literal('script'),
    path: z.string().min(1),
    hash: z.string().min(1).optional(),
  })
  .strict();

const adminShellPluginStyleFileSchema = z
  .object({
    type: z.literal('style'),
    path: z.string().min(1),
    hash: z.string().min(1).optional(),
  })
  .strict();

/**
 * @alpha
 * Validates a static asset declaration for an admin shell plugin.
 */
export const adminShellPluginContentFileSchema = z
  .object({
    type: z.enum(['style', 'script']),
    path: z.string().min(1),
    hash: z.string().min(1).optional(),
  })
  .strict();

/**
 * @alpha
 * Validates an admin plugin manifest entry for runtime ABI v1.
 */
export const adminShellPluginInfoSchema = z
  .object({
    moduleId: z.string().regex(MODULE_ID_PATTERN),
    moduleVersion: z.string().min(1),
    runtimeApiVersion: z.literal(ADMIN_SHELL_RUNTIME_API_VERSION),
    entry: adminShellPluginEntrySchema,
    contentFiles: z.array(adminShellPluginStyleFileSchema),
  })
  .strict()
  .superRefine((plugin, ctx) => {
    const declaredAssets = [plugin.entry, ...plugin.contentFiles];
    const assetIndexes = new Map<string, number>();

    declaredAssets.forEach((asset, index) => {
      const key = `${asset.type}:${asset.path}`;
      const previousIndex = assetIndexes.get(key);

      if (previousIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate asset declaration also declared at index ${previousIndex.toString()}.`,
          path: index === 0 ? ['entry'] : ['contentFiles', index - 1],
        });
      } else {
        assetIndexes.set(key, index);
      }
    });
  });

/**
 * @alpha
 * Validates an ordered plugin list and rejects duplicate module identifiers.
 */
export const adminShellPluginInfosSchema = z
  .array(adminShellPluginInfoSchema)
  .superRefine((plugins, ctx) => {
    const moduleIndexes = new Map<string, number>();

    plugins.forEach((plugin, index) => {
      const previousIndex = moduleIndexes.get(plugin.moduleId);

      if (previousIndex !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate module ID also declared at index ${previousIndex.toString()}.`,
          path: [index, 'moduleId'],
        });
      } else {
        moduleIndexes.set(plugin.moduleId, index);
      }
    });
  });
