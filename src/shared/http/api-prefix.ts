// Each API controller prefixes its own path with this, instead of a global prefix:
// the public redirect (GET /:shortCode) must stay at the root, and Nest's
// prefix `exclude` option matches by path pattern, so excluding ':shortCode'
// would also strip the prefix from every one-segment GET route such as /links.
export const API_PREFIX = 'api/v1';
