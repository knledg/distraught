/* @flow */
export const requireJWTAuth =
  process.env.DISABLE_JWT_AUTH === 'true' ? false : 'jwt';
