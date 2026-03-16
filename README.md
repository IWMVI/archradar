# archradar

**Architectural Intelligence Engine for modern frontend teams.**

> Scan your project. Understand your architecture. Fix what matters.
> By [Few Company](https://fewcompany.com)

---

## Install

```bash
npm install -g archradar
```

Or run without installing:

```bash
npx archradar
```

---

## Usage

Run inside any frontend project:

```bash
archradar
```

### Commands

```bash
archradar scan           # Full architectural scan (default)
archradar scan --json    # Output results as JSON
archradar auth login     # Authenticate for premium features
archradar auth logout    # Log out
archradar --version      # Show version
archradar --help         # Show help
```

---

## What it analyzes

- **Framework detection** — React, Next.js, Vite, Vue, Angular, Svelte
- **Dependency health** — outdated, unused, and high-risk packages
- **File structure** — folder depth, file size distribution, critical files
- **Complexity** — cyclomatic complexity via AST analysis
- **Coupling** — inter-module dependencies and coupling density
- **Circular dependencies** — detected and mapped
- **Modularity** — cohesion and separation of concerns

---

## Output

```
┌─────────────────────────────────────────┐
│         ARCHRADAR — Few Company         │
│    Architectural Intelligence Engine    │
└─────────────────────────────────────────┘

Framework:      Next.js 14
Files scanned:  312
Dependencies:   48 (3 outdated, 1 high-risk)

ARCHITECTURAL HEALTH SCORE
██████████░░░░░░░░░░  52 / 100

Risk Level:     HIGH
Complexity:     78 (above threshold)
Coupling:       0.62 (dense)
Circular deps:  4 detected

RECOMMENDATIONS
  ✖  Break down files above 400 lines (12 found)
  ✖  Resolve circular dependencies in /features
  ⚠  Reduce coupling in /components layer
  ✔  Dependency versions are mostly up to date

──────────────────────────────────────────
  Powered by Few Company · archradar.dev
──────────────────────────────────────────
```

---

## Premium

Unlock advanced features with a premium subscription ($5/month):

- Deep architectural reports
- Version comparison and history
- Markdown/PDF export
- Strategic insights
- CI/CD integration

```bash
archradar auth login
```

---

## Requirements

- Node.js >= 20.0.0

