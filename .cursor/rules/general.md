# General Development Guidelines

## Project Overview
- **Project Type**: Headless platform, expandable with plug-in modules
- **Language**: TypeScript
- **Architecture**: Micro-core architecture (headless design)
- **Purpose**: Provide a flexible platform for building applications

## Code Style
- Use TypeScript for all new code with strict configuration
- Follow standard TypeScript naming conventions:
  - PascalCase for classes and interfaces
  - camelCase for variables and functions
  - UPPER_SNAKE_CASE for constants
  - kebab-case with suffix (`user-profile.service.ts`, `user-data.manager.ts`) for file names
- Use meaningful variable and function names
- Prefer const over let when possible
- Use strict TypeScript configuration
- Avoid `any` type - use proper union types and interfaces

## Architecture Principles
- **Micro-core Architecture**: Maintain a minimal platform core with expansion through plug-in modules
- **Single Responsibility**: Each module should have one reason to change
- **Loose Coupling**: Minimize dependencies between modules
- **High Cohesion**: Related functionality should be grouped together
- **Dependency Injection**: Use DI for better testability and flexibility
- **Interface Segregation**: Define small, focused interfaces

### Recommendations
- Use dependency injection where appropriate
- Follow separation of concerns
- Maintain weak component coupling
- Design for extensibility and testability

## Best Practices
- Write comprehensive type definitions
- Use interfaces to define contracts between modules
- Implement proper error handling with custom error classes
- Add meaningful comments for complex logic
- Follow security best practices (OWASP)
- Optimize for performance where critical
- Use functional programming patterns where appropriate
- Maintain consistent code formatting using Prettier

## Testing
- Write unit tests for all business logic using Jest
- Use integration tests for module interactions
- Follow test-driven development when possible
- Maintain high test coverage (minimum 80%) for core functionality
- Use mocking appropriately for external dependencies
- Implement performance benchmarks for critical paths
- Ensure good test coverage for critical paths

## Git Workflow
- Run Git commands only on request
- Use descriptive commit messages following conventional commit format
- Create feature branches for new development with descriptive names
- Use pull requests for code review with at least one approval
- Ensure all tests pass before merging to main branch
- Use semantic versioning for releases
- Keep commits atomic and focused
- Review code through pull requests
- Keep commits atomic and focused
