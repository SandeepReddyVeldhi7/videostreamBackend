import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { APIError } from "../utils/APIError.js";

dotenv.config();

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return next(new APIError("Unauthorized request", 401));

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return next(new APIError("Unauthorized request", 401));
    req.user = user;
    next();
  });
};


// Exporting the function using named export
export { verifyJWT };