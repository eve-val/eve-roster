import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

export async function fetchAuthInfo(
  accessToken: string,
): Promise<AuthInfoResponse & JWTPayload> {
  const result = await jwtVerify(
    accessToken,
    createRemoteJWKSet(new URL("https://login.eveonline.com/oauth/jwks"), {
      cacheMaxAge: 7 * 24 * 60 * 60 * 1000, // 1 week max cache age
      cooldownDuration: 24 * 60 * 60 * 1000, // 1 day cooldown if successful
      timeoutDuration: 5000, // 5 second fetch timeout
    }),
    {
      issuer: "login.eveonline.com",
    },
  );
  return <AuthInfoResponse & JWTPayload>result.payload;
}

interface AuthInfoResponse {
  name: string;
  owner: string;
  scp: string[];
}
