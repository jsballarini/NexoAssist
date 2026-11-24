export class ConversationAlreadyAssignedError extends Error {
  readonly code = "ALREADY_ASSIGNED";
  readonly httpStatus = 409;
  constructor(
    message = "Conversa já assumida por outro analista",
    public assignedAnalyst?: { name: string },
  ) {
    super(message);
    this.name = "ConversationAlreadyAssignedError";
  }
}

export class AnalystHandoffError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = "AnalystHandoffError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}