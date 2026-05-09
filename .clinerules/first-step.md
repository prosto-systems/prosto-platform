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
- `tsconfig.json` and `packages/*/tsconfig.json` - for TypeScript configuration
- `eslint.config.js` - for linting rules
- `prettier.config.js` - for formatting rules
- `jest.config.js` or `vitest.config.ts` - for testing configuration
- `.github/workflows/` - for CI/CD pipelines

### Repository State Validation (CRITICAL)

**BEFORE making any recommendations, verify:**

- [ ] `packages/*/tsconfig.json` exist
- [ ] `packages/` directory exists (monorepo structure)
- [ ] `packages/*/src` exists for implemented packages
- [ ] `.github/workflows/` exists (CI/CD)
- [ ] Test runner configured (Vitest/Jest)
- [ ] ESLint configured
- [ ] Prettier configured

### If Repository Is In Pre-Implementation Stage

**If files are missing:**

1. **State clearly** that project is in pre-implementation stage
2. **Do NOT claim** lint/test commands are available
3. **Reference** `.context/04-implementation-plan/` for roadmap
4. **Recommend** Phase 01/02 tasks before feature implementation

**Current Status (May 2026):**
- Architecture documentation complete in `.context/`
- 10-phase implementation plan ready with Admin Enablement stream
- 9 ADRs drafted including hybrid admin model
- Phase 01 governance workflows are implemented
- Phase 02 workspace/package baseline is implemented
- Phase 03 SDK contract baseline is implemented
- Phase 04 contract conformance package and reference module validation are implemented
- Phase 05 core runtime foundation is partially implemented (lifecycle, bootstrap, diagnostics, loader, graph, policy, events, services — 13 subsystems)
- Current active implementation phase: Phase 06 (security/performance hardening)

### Existing Rules
- `.cursorrules` - Cursor-specific rules
- `.cursor/rules/` - Detailed Cursor rules by category
- `.clinerules/` - Cline-specific rules
- `.kilocode/rules/` - KiloCode rules
- `.github/copilot-instructions.md` - Copilot-specific instructions
- `AGENTS.md` - Main guidelines for all AI agents

### Project Structure
- Source code organization (when implemented)
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

**CRITICAL: Architecture Boundary Rules (ADR-0001)**
- `platform-core` MUST NOT import from adapters or modules
- Modules MUST NOT import from other modules
- `platform-sdk` MUST have minimal dependencies
- Always validate dependencies against package boundaries

### Development Workflow
- Git workflow and branching strategy
- Testing strategy and coverage requirements
- Code review process
- Deployment considerations

**Current Phase Priority:**
- Completed: Phase 01 Governance Activation (CI gates, branch protection)
- Completed: Phase 02 Monorepo Package Skeleton
- Completed: Phase 03 SDK Contract Baseline
- Completed: Phase 04 Contract Conformance Test Package
- Partially completed: Phase 05 Core Runtime Foundation (13 subsystems implemented: bootstrap, common, context, diagnostics, events, graph, lifecycle, loader, logging, policy, runtime, services, validation)
- Active: Phase 06 Security and Performance Hardening
- (See `.context/04-implementation-plan/` for full roadmap)

### Performance & Security
- Performance optimization guidelines
- Security best practices (allowlist, integrity checks)
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
