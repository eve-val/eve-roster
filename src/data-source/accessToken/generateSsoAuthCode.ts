export function generateSsoAuthToken(
  ssoClientId: string,
  ssoSecretKey: string
) {
  return Buffer.from(`${ssoClientId}:${ssoSecretKey}`).toString("base64");
}
