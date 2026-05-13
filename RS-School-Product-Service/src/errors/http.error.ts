export class HttpError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class NotFoundError extends HttpError {
    constructor(message: string = 'Resource not found') {
        super(404, message);
    }
}

export class BadRequestError extends HttpError {
    constructor(message: string = 'Bad request') {
        super(400, message);
    }
}