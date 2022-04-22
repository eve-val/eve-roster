import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";

export async function fetchAuthInfo(
  accessToken: string
): Promise<AuthInfoResponse & JWTPayload> {
  const result = await jwtVerify(
    accessToken,
    createRemoteJWKSet(new URL("https://login.eveonline.com/oauth/jwks"), {
      cacheMaxAge: Infinity,
    }),
    {
      issuer: "login.eveonline.com",
    }
  );
  return <AuthInfoResponse & JWTPayload>result.payload;
}

interface AuthInfoResponse {
  name: string;
  owner: string;
  scp: string[];
}
