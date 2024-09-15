import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { APIError } from "../utils/APIError.js";

dotenv.config();

function verifyJWT(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return next(new APIError(401, "No token provided"));
  }

  // JWT verification logic here
  // If verification fails, send a valid error response

  try {
    // Assuming jwt.verify is a function that verifies the JWT
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new APIError(401, "Invalid token"));
      }
      req.user = decoded;
      next();
    });
  } catch (err) {
    return next(new APIError(401, "Failed to authenticate token"));
  }
}


// Exporting the function using named export
export { verifyJWT };