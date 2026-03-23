# The first step on the first scan/project openings

Please analyze this codebase (project) and create or improve AGENTS.md file containing:
1. Build/lint/test commands (if package.json exists)
2. Recommendations on code style, including import, formatting, types, naming conventions, error handling, etc.
3. Project architecture and structure guidelines
4. Development workflow and best practices
5. Security and performance considerations

The file you created will be transferred to AI programming assistants (like you) who work in this repository. It should be about 150-200 lines long.

## Analysis Requirements

When analyzing the project, check for:

### Configuration Files
- `package.json` - for build commands, dependencies, and scripts
- `tsconfig.json` - for TypeScript configuration
- `eslint.config.js` - for linting rules
- `prettier.config.js` - for formatting rules
- `jest.config.js` - for testing configuration

### Existing Rules
- `.cursorrules` - Cursor-specific rules
- `.cursor/rules/` - Detailed Cursor rules by category
- `.github/copilot-instructions.md` - Copilot-specific instructions
- Other AI agent configuration files

### Project Structure
- Source code organization
- Module structure and architecture
- Test file organization
- Documentation patterns

### Code Patterns
- Language/framework used
- Common libraries and dependencies
- Testing frameworks
- Build tools and scripts

## Guidelines to Include

### Code Style
- Naming conventions (files, classes, functions, variables)
- Import/export strategies
- Type definitions and annotations
- Formatting preferences
- Commenting standards

### Architecture
- Project structure and organization
- Module boundaries and responsibilities
- Dependency management
- Error handling patterns
- Security best practices

### Development Workflow
- Git workflow and branching strategy
- Testing strategy and coverage requirements
- Code review process
- Deployment considerations

### Performance & Security
- Performance optimization guidelines
- Security best practices
- Common pitfalls to avoid
- Monitoring and debugging practices

## If AGENTS.md Already Exists

If you find an existing AGENTS.md file:
1. Compare it with the current project structure
2. Update outdated information
3. Add missing sections based on current project needs
4. Ensure consistency with existing Cursor rules and other configuration files
5. Remove any obsolete commands or practices

## Project Context

This is **prosto-platform** - a headless platform, expandable with plug-in modules and written in TypeScript. The project follows modern development practices with a focus on maintainability, testability, and performance.

Key principles to emphasize:
- Micro-core architecture (minimal platform core with expansion through plug-in modules)
- TypeScript strict configuration
- Modular design with single responsibility
- Test-driven development
- Security-first approach
- Performance optimization
