function errorHandler(err, req, res, next) {
    // Let Express finish handling errors after a response has started.
    if (res.headersSent) {
        return next(err);
    }

    let statusCode = 500;
    let code = "INTERNAL_ERROR";
    let message = "Something went wrong";

    if (err.type === "entity.parse.failed") {
        statusCode = 400;
        code = "INVALID_JSON";
        message = "Request body must contain valid JSON";
    }

    if (err.type === "entity.too.large") {
        statusCode = 413;
        code = "PAYLOAD_TOO_LARGE";
        message = "JSON request body must not exceed 16 KB";
    }

    if (err.type === "charset.unsupported" || err.type === "encoding.unsupported") {
        statusCode = 415;
        code = "UNSUPPORTED_ENCODING";
        message = "Request encoding is not supported";
    }

    // Send fixed messages, never the raw error, stack trace or request body.
    return res.status(statusCode).json({
        success: false,
        error: {
            code: code,
            message: message,
        },
    });
}

export default errorHandler;
