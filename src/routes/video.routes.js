import { Router } from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.js";
import {
  publishAVideo,
  deleteVideo,
  getAllVideosByOption,
  togglePublishStatus,
  updateVideo,
  getNextVideos,
  updateVideoViews,
  getVideoByIdForGuest,
  getAllVideos,
  getVideoById,
} from "../controllers/video.controller.js";



const router = Router();

router
  .route("/").get(getAllVideos)
 

  router.route("/upload").post(
    verifyJWT,
    upload.fields([
      {
        name: "videoFile",
        maxCount: 1,
      },
      {
        name: "thumbnail",
        maxCount: 1,
      },
    ]),
    publishAVideo
  );
   
router.route("/all/option").get(getAllVideosByOption)

router
  .route("/v/:videoId")
  .get(getVideoById)
  .delete(verifyJWT, deleteVideo)
    .put(verifyJWT, upload.single("thumbnail"), updateVideo);
  
    router
      .route("/toggle/publish/:videoId")
    .patch(verifyJWT, togglePublishStatus);
      
router.route("/next/:videoId").get(getNextVideos);

router.route("/v/guest/:videoId").get(getVideoByIdForGuest);


router.route("/update/views/:videoId").put(verifyJWT, updateVideoViews);

export default router;