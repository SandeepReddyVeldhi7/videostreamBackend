import { User } from "../models/user.model.js";
import { APIError } from "../utils/APIError.js";
import jwt from "jsonwebtoken";

const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

   // console.log("Received token:", token);
    if (!token) {
      throw new APIError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN);
  //  console.log("Decoded token:", decodedToken);
//console.log("ACCESS_TOKEN:", process.env.ACCESS_TOKEN);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
  //  console.log("user found", user);
    if (!user) {
      throw new APIError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in verifyJWT middleware:", error);
    if (error.name === "TokenExpiredError") {
      next(new APIError(401, "Access token expired"));
    } else {
      next(new APIError(401, error?.message || "Invalid access token"));
    }
  }
};

export { verifyJWT };
