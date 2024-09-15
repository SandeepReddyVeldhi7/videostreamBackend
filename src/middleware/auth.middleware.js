import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { APIError } from "../utils/APIError.js";

dotenv.config();

const verifyJWT = async (req, _, next) => {
  const authHeader = req.header("Authorization");
  const token =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  console.log("123456", token);

  if (!token) {
    throw new APIError(401, "unauthorization");
  }

  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "password -refreshToken"
    );
    if (!user) {
      throw new APIError(401, "unauthorized");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new APIError(401, error?.message || "Invalid access token");
  }
};


// Exporting the function using named export
export { verifyJWT };