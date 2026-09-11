import type { IPlatformRuntimeComponentIdentity } from '@/platform/adapters/index.js';
import type {
  IPersistenceDescriptor,
  IPersistenceDescriptorRegistrar,
  IPersistenceDescriptorRegistry,
} from '../interfaces/index.js';
import { PersistenceError } from '../errors/index.js';

/**
 * @alpha
 * In-memory registry enforcing descriptor ownership and immutability.
 */
export class PersistenceDescriptorRegistry implements IPersistenceDescriptorRegistry {
  readonly #descriptors = new Map<string, IPersistenceDescriptor>();
  #sealed = false;

  registerPlatform(descriptor: IPersistenceDescriptor): void {
    this.#assertCollecting('platform');

    if (descriptor.owner !== 'platform' || descriptor.ownerId !== 'platform') {
      throw new PersistenceError(
        'PersistenceDescriptorOwnerMismatch',
        'The platform descriptor must be owned by "platform".',
        {
          moduleId: 'platform',
          ownerId: descriptor.ownerId,
          phase: 'collecting',
          remediationHint:
            'Use an owner-scoped registrar for module and adapter descriptors.',
        },
      );
    }

    this.#register('platform', descriptor);
  }

  createRegistrar(
    owner: IPlatformRuntimeComponentIdentity,
  ): IPersistenceDescriptorRegistrar {
    return {
      register: (descriptor: IPersistenceDescriptor): void => {
        this.#assertCollecting(owner.id);

        if (
          descriptor.owner !== owner.type ||
          descriptor.ownerId !== owner.id
        ) {
          throw new PersistenceError(
            'PersistenceDescriptorOwnerMismatch',
            `Persistence descriptor owner "${descriptor.ownerId}" does not match registering ${owner.type} "${owner.id}".`,
            {
              moduleId: owner.id,
              ownerId: descriptor.ownerId,
              phase: 'collecting',
              remediationHint:
                'Use the owner identity supplied by the runtime adapter or module context.',
            },
          );
        }

        this.#register(this.#ownerKey(owner), descriptor);
      },
    };
  }

  rollback(owner: IPlatformRuntimeComponentIdentity): void {
    this.#assertCollecting(owner.id);
    this.#descriptors.delete(this.#ownerKey(owner));
  }

  seal(): readonly IPersistenceDescriptor[] {
    this.#sealed = true;

    return Object.freeze([...this.#descriptors.values()]);
  }

  #register(key: string, descriptor: IPersistenceDescriptor): void {
    if (this.#descriptors.has(key)) {
      throw new PersistenceError(
        'PersistenceDuplicateDescriptor',
        `A persistence descriptor is already registered for "${key}".`,
        { moduleId: key, ownerId: descriptor.ownerId, phase: 'collecting' },
      );
    }

    this.#descriptors.set(key, descriptor);
  }

  #assertCollecting(ownerId: string): void {
    if (this.#sealed) {
      throw new PersistenceError(
        'PersistenceRegistryNotCollecting',
        'Persistence descriptors can only be registered while collection is open.',
        {
          moduleId: ownerId,
          phase: 'sealed',
          remediationHint:
            'Register the descriptor during component initialization.',
        },
      );
    }
  }

  #ownerKey(owner: IPlatformRuntimeComponentIdentity): string {
    return `${owner.type}:${owner.id}`;
  }
}
