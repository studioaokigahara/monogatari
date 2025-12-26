# Monogatari

## Notes on Installation
`dexie-export-import` needs to be patched in order to fix encapsulation and revival bugs with instances of `File` in `typeson`. As a result, a package manager that natively supports dependency patching is currently required; ergo, `npm` is NOT supported. Please use `yarn`, `pnpm`, or preferably `bun`.
