import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js"

import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";

const router = Router();
router.route("/:videoId").get(getVideoComments);
router.use(verifyJWT);

router.route("/:videoId").post(addComment);
router.route("/c/:commentId").delete(deleteComment).put(updateComment);

export default router;

