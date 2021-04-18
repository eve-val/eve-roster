import { UnauthorizedClientError } from "./UnauthorizedClientError";

export class MissingPrivilegeError extends UnauthorizedClientError {
  constructor(
    public accountId: number,
    public permission: string,
    public level: number,
    public isOwner: boolean,
    public groups: string[],
    public perms: Map<string, Object>
  ) {
    super(
      `Missing permission (${permission}, ${level}) for account ` +
        `${accountId} (isOwner=${isOwner}). Groups=[${groups}]`
    );
  }
}
