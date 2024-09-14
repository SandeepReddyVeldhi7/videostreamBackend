// src/middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  if (err instanceof APIError) {
    return err.handleResponse(res);
  }
  return res.status(500).json({ error: "An unexpected error occurred" });
};
export {errorHandler}