import "server-only";

export class ServerApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ServerApiError";
    this.status = status;
    this.code = code;
  }
}
