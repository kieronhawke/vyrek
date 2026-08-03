// No-op stand-in for the `server-only` package under vitest.
// The real package throws outside a Server Component, which would make
// every server-side data source impossible to unit-test.
export {};
