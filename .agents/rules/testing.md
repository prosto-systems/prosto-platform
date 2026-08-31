# Testing Guidelines

## Testing Strategy

- Use **Vitest** as the repository-configured test runner
- Implement comprehensive test coverage for all components
- Use unit tests for isolated component testing
- Create integration tests for module interactions
- Add end-to-end tests for critical user workflows
- Maintain test suites that run quickly and reliably
- Maintain high test coverage for core functionality once CI coverage gates are enabled
- Use mocking appropriately for external dependencies
- Implement performance benchmarks for critical paths

### Test Pyramid

```
    E2E Tests (Few, Slow)
   Integration Tests (Some, Medium)
  Unit Tests (Many, Fast)
```

### Common Commands

```bash
npm run test                                  # Run tests across workspaces
npm run test --workspace=@prosto/platform-sdk # Run SDK tests
npm run test:contracts                        # Run workspaces that expose contract tests
```

There is no root-level unit-test-only script. Use a package's `test:unit`
script where it exists, such as `@prosto/platform-sdk` or
`@prosto/platform-admin-shell`.

## Test Structure

- Organize tests alongside source code in `__tests__` directories or colocated `*.test.ts` files
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert
- Group related tests in describe blocks
- Use proper test setup and teardown
- Implement proper test data cleanup

### Unit Testing with Vitest

```typescript
import { describe, it, beforeEach, expect } from 'vitest';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: Partial<UserRepository>;
  
  beforeEach(() => {
    mockRepository = {
      findById: async () => ({ id: '123', name: 'John' }),
    };
    userService = new UserService(mockRepository as UserRepository);
  });
  
  describe('getUser', () => {
    it('should return user when found', async () => {
      const result = await userService.getUser('123');
      
      expect(result).toEqual({ id: '123', name: 'John' });
    });
  });
});
```

## Mocking Strategy

- Mock external dependencies (APIs, databases, file systems)
- Use dependency injection to facilitate mocking
- Avoid mocking internal implementation details
- Prefer real implementations for unit tests when possible
- Use test doubles for complex external systems
- Use factories for generating test data

## Module Contract Testing

The platform provides reusable contract tests for module conformance:

```typescript
// examples/module-health/tests/contracts.test.ts
import { describe, it } from 'vitest';
import { createModuleContractTests } from '@prosto/platform-contract-tests';
import manifest from '../manifest.json';
import { PlatformModule } from '../src/platform/platform.module.js';

describe('HealthModule contract', () => {
  createPlatformModuleContractTests(
    { manifest, module: new PlatformModule() },
    { describe, it }, // Pass Vitest helpers
  );
});
```

**All modules MUST pass contract tests before integration:**

```bash
npm run test:contracts
```

## Test Data

- Use realistic but anonymized test data
- Create test fixtures for common scenarios
- Implement data factories for generating test objects
- Clean up test data after each test run
- Avoid hardcoded test values
- Use meaningful comments for complex logic

## Performance Testing

- Include performance benchmarks for critical paths
- Test memory usage for long-running operations
- Validate response times for user-facing operations
- Monitor test execution time and optimize slow tests
- Use profiling tools to identify bottlenecks
- Optimize critical paths for performance

## Continuous Integration

- Run tests on every commit and pull request
- Fail builds on test failures or coverage drops
- Use parallel test execution for faster feedback
- Implement smoke tests for deployed environments
- Monitor test results and trends over time
- Ensure all tests pass before merging to main branch
