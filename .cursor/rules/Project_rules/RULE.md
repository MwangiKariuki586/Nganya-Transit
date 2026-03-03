---
alwaysApply: true
---

# Cursor Rules – Next.js Projects

## 1. General Principles

- AI is a helper, not a decision-maker.
- Work in small units: one component, one API route, one schema at a time.
- Every output must include a brief explanation or comment.
- Follow existing naming conventions, folder structure, and code style.
- Do not introduce new dependencies unless approved.
- Do not generate security-critical code (auth, payments, cryptography) unsupervised.
- Always review and modify AI output.

## 2. Frontend / React Components

- Use React functional components and hooks only.
- Use Tailwind CSS for styling.
- Follow atomic design: Atoms → Molecules → Organisms → Pages.
- Include Error Boundaries for major components/pages with fallback UI and retry.
- Generate components incrementally; avoid full pages in one output.
- Avoid inline styles unless necessary.
- Include PropTypes or TypeScript types.
- Include loading and error states for data fetching.
- Provide comments explaining complex logic or layout decisions.

## 3. API Routes / Backend

- Generate only the requested endpoint (GET, POST, PUT, DELETE).
- Include proper error handling (try/catch or Next.js responses).
- Follow RESTful or GraphQL conventions as specified.
- Do not include authentication/authorization unless explicitly requested.
- Include input validation and sanitization.
- Focus on a single resource per output; avoid full features.

## 4. Database / Models

- Scaffold models/schemas only (Prisma, Mongoose, etc.).
- Include field validation, types, and relationships.
- Include timestamps where applicable.
- Do not auto-generate migrations.
- Avoid circular dependencies.
- Include comments explaining each field and relation.
- Do not hardcode secrets or credentials.
- Consolidate related database changes (schema, triggers, RLS, helper functions) into a single migration file per feature to maintain a clean migration history.

## 5. Authentication & Security

- Do not generate sensitive logic unsupervised.
- Use NextAuth.js or JWT only if specified.
- Secrets must be in environment variables, not code.
- Validate user input and check permissions.
- Include comments on potential security implications.

## 6. State Management & Data Fetching

- Use React Query, SWR, or Context API for server state.
- Use useState/useReducer for local UI state.
- Include loading and error handling in hooks.
- Avoid storing sensitive data in local storage without encryption.

## 7. Refactoring / Code Quality

- Only refactor provided code; do not add unrelated features.
- Do not change external behavior.
- Suggest improvements for readability, maintainability, and performance.
- Include comments explaining changes.
- Preserve existing API contracts.

## 8. Testing

- Generate unit tests (Jest + React Testing Library) or integration tests (Cypress/Playwright) if requested.
- Include clear test descriptions and expected outcomes.
- Mock external dependencies when necessary.
- Cover edge cases wherever possible.

## 9. Deployment & Environment

- Use `.env.local` for secrets and config.
- Provide `.env.example` for sharing defaults.
- Follow best practices for Vercel or specified hosting.
- Avoid committing secrets or sensitive information.
- Suggest performance and bundle size optimizations.

## 10. Prompting & Workflow

- Always include task scope in prompts (e.g., “only generate API route for /posts GET”).
- Ask for explanations and trade-offs where applicable.
- Generate one unit at a time.
- Do not generate entire features or pages at once.
- Include comments and instructions for manual review.
- Reference this rule set explicitly in prompts for consistent results.
