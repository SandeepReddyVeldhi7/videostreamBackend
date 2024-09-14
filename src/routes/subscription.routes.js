import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import {
  getSubscribedChannels,
  getUserChannelSubscribers,
  toggleSubscription,
} from "../controllers/subscription.controller.js";

const router = Router()

 // Apply verifyJWT middleware to all routes in this file
router.use(verifyJWT)
router
  .route("/c/:username")
  .get(getUserChannelSubscribers)
   router.route("/c/:channelId") .post(toggleSubscription);
router.route("/u/:subscriberId").get(getSubscribedChannels);
   
export default router;