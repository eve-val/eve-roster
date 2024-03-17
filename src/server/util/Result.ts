export type Result<T> = SuccessResult<T> | ErrorResult<T>;

export class BaseResult<T> {
  private sentinel: T | undefined;

  constructor(public readonly kind: "success" | "error") {}

  isSuccess(): this is SuccessResult<T> {
    return this.kind == "success";
  }

  isError(): this is ErrorResult<T> {
    return this.kind == "error";
  }

  unwrap(): T {
    if (this.isSuccess()) {
      return this.value;
    } else if (this.isError()) {
      throw this.error;
    }
    {
      throw new Error(`This should never happen`);
    }
  }

  static success<T>(value: T) {
    return new SuccessResult(value);
  }

  static error<T>(error: unknown) {
    return new ErrorResult<T>(error);
  }
}

class SuccessResult<T> extends BaseResult<T> {
  constructor(public readonly value: T) {
    super("success");
  }
}

class ErrorResult<T> extends BaseResult<T> {
  constructor(public readonly error: unknown) {
    super("error");
  }
}

export function success<T>(value: T): Result<T> {
  return new SuccessResult<T>(value);
}

export function failure<T>(error: unknown): Result<T> {
  return new ErrorResult<T>(error);
}
