import { createRemoteJWKSet } from "jose/jwks/remote";
import { jwtVerify } from "jose/jwt/verify";
import { JWTPayload } from "jose/types";

export async function fetchAuthInfo(
  accessToken: string
): Promise<AuthInfoResponse & JWTPayload> {
  const result = await jwtVerify(
    accessToken,
    createRemoteJWKSet(new URL("https://login.eveonline.com/oauth/jwks")),
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
