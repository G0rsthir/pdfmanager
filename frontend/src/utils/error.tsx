import { ZodError } from "zod";

export class APIError extends Error {
  public type: string;
  public details: unknown;

  constructor(message: string) {
    super(message);
    this.type = "apiError";
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export function parseAPIError(error: unknown): APIError {
  const apiError: APIError = new APIError("Internal server error");

  if (error === null) return apiError;

  // plain string
  if (typeof error === "string") {
    apiError.message = error;
    return apiError;
  }

  // native JS
  if (error instanceof Error) {
    apiError.message = error.message;
    apiError.stack = error.stack;
    return apiError;
  }

  apiError.details = error;

  // Fetch API - FastAPI Error
  if (typeof error === "object" && "detail" in error) {
    const detail = error.detail;

    if (typeof detail === "string" || typeof detail === "number") {
      apiError.message = String(detail);
      return apiError;
    }

    if (Array.isArray(detail) && detail[0]?.loc && detail[0]?.msg) {
      apiError.message = `${detail[0].loc.slice(-1)[0]}: ${detail[0].msg}`;
      return apiError;
    }
  }

  return apiError;
}

export function parseFormError(error: unknown): Record<string, unknown> {
  if (error === null) return {};

  // plain string
  if (typeof error === "string") {
    return {
      form: error.substring(0, 100),
    };
  }

  // Zod error
  if (error instanceof ZodError) {
    const errors: {
      fields: Record<string, string>;
      form?: string;
    } = {
      fields: {},
    };

    for (const item of error._zod.def) {
      const keys = item.path;

      if (keys?.[0] === "body") keys.shift();

      const key = keys.join(".");
      errors.fields[key] = item.message;
    }
    return errors;
  }

  // Native JS
  if (error instanceof Error) {
    return {
      form: error.message,
    };
  }

  // Fetch API - FastAPI Error
  if (typeof error === "object" && "detail" in error) {
    const detail = error.detail;

    if (typeof detail === "string" || typeof detail === "number") {
      return { form: String(detail) };
    }

    if (Array.isArray(detail) && detail[0]?.loc && detail[0]?.msg) {
      const errors: {
        fields: Record<string, string>;
        form?: string;
      } = {
        fields: {},
      };

      for (const item of detail) {
        const keys: string[] = item.loc;

        // If the first location segment is "path", it means the error is about a URL path parameter
        // (not a body field). In this case we treat it as a root-level error.
        if (keys?.[0] === "path") {
          errors.form = item.msg;
          continue;
        }

        if (keys?.[0] === "body") keys.shift();

        const key = keys.join(".");
        errors.fields[key] = item.msg;
      }
      return errors;
    }
  }

  return {
    form: "Internal server error",
  };
}
