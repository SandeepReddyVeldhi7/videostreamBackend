const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken || // Check if token is stored in cookies
      req.header("Authorization")?.replace("Bearer ", ""); // Or check Authorization header

    console.log("Received Token:", token); // Add logging for debugging

    if (!token) {
      throw new APIError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log("Decoded Token: ", decodedToken); // Log decoded token to check user details

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new APIError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in verifyJWT middleware:", error); // Log the error
    if (error.name === "TokenExpiredError") {
      next(new APIError(401, "Access token expired"));
    } else {
      next();
    }
  }
};


// Exporting the function using named export
export { verifyJWT };