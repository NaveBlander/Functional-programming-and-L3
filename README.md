# Functional-programming-and-L3

## Description

This project implements various utilities and functions in TypeScript for L3 language processing and shared functionality. It includes modules for abstract syntax trees (AST), environment management, evaluation, and lexical transformations.

## Files

### L3 Directory

- **L3-ast.ts**: Defines the abstract syntax tree structures for the L3 language.
- **L3-env-env.ts**: Manages environments for the L3 interpreter.
- **L3-env-sub.ts**: Handles environment substitution operations for the L3 interpreter.
- **L3-eval-env.ts**: Evaluates L3 expressions within given environments.
- **L3-eval-sub.ts**: Evaluates L3 expressions with substitution handling.
- **L3-value.ts**: Defines value types and operations for the L3 language.
- **LexicalTransformations.ts**: Handles lexical transformations for L3 expressions.
- **evalPrimitive.ts**: Evaluates primitive operations in L3.
- **substitute.ts**: Manages substitution operations for L3 expressions.

### Shared Directory

- **box.ts**: Provides a box data structure.
- **format.ts**: Contains utility functions for formatting.
- **list.ts**: Implements list operations.
- **optional.ts**: Defines optional types and operations.
- **parser.ts**: Contains parsing functions.
- **result.ts**: Manages result types and operations.
- **s-expression.d.ts**: Type definitions for s-expressions.
- **type-predicates.ts**: Type predicates for runtime type checking.

### Configuration Files

- **package-lock.json**: Describes the exact dependency tree.
- **package.json**: Contains project metadata and dependencies.
- **tsconfig.json**: TypeScript configuration file.

### Test Directory

- **test**: Contains unit tests for the project.

## Usage

### Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/your-repo-name.git
   cd Functional-programming-and-L3
2. **Install dependencies:**
   ```sh
   npm install
   
### Build

**Compile TypeScript to JavaScript:**
   ```sh
   npm run build
