import express from "express"
import { Router } from "express";
import multer from "multer";
import {
  addVideoToWatchHistory,
  changeCurrentPassword,
  clearWatchHistory,
  getCurrentUser,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshAccessToken,
  Register,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import {upload} from "../middleware/multer.js"
import { verifyJWT} from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverPhoto", maxCount: 1 },
  ]),
  Register
);

router.route("/login").post((loginUser))


//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,
  changeCurrentPassword)
router.route("/current-user").get(verifyJWT,
  getCurrentUser)
router.route("/update-account").put(verifyJWT,
  updateAccountDetails)

router.route("/avatar").patch(verifyJWT, upload.single
  ("avatar"), updateUserAvatar)
  


router.route("/coverPhoto").put(verifyJWT, upload.single
  ("coverPhoto"), updateUserCoverImage)

router.route("/c/:username").get(verifyJWT,
  getUserChannelProfile)


  router.route("/history").get(verifyJWT,getWatchHistory)

 router.route("/user-addHistory").post(verifyJWT,addVideoToWatchHistory)


  router.route("/clear-history").delete(verifyJWT,clearWatchHistory)
export default router;