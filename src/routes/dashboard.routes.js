import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getChannelAbouts,
  getChannelStatus,
  getChannelVideos,
} from "../controllers/dashboard.controller.js";
const router = Router();

router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/stats").get(getChannelStatus);
router.route("/videos").get(getChannelVideos);
router.route("/about").get(getChannelAbouts);

export default router;