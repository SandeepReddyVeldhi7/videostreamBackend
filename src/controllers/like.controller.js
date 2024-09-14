import mongoose ,{isValidObjectId} from "mongoose";
import { APIResponse } from "../utils/APIResponse.js";
import { Like } from "../models/like.model.js";
import { APIError } from "../utils/APIError.js";

const toggleVideoLike = async (req, res) => {

  const { videoId } = req.params;
  const userId = req.user?._id;

  let likeVideo = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });

  if (likeVideo) {
    await Like.findByIdAndDelete(likeVideo._id);
    return res.status(200).json(new APIResponse(200, null, "Video unliked"));
  } else {
    likeVideo = await Like.create({ video: videoId, likedBy: userId });
    return res.status(200).json(new APIResponse(200, likeVideo, "Video liked"));
  }
};


const toogleVideoDislike = async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

  let likeVideo = await Like.findOne({
    video: videoId,
    DislikedBy: userId,
  });

  if (likeVideo) {
    await Like.findByIdAndDelete(likeVideo._id);
    return res.status(200).json(new APIResponse(200, null, "Video unliked"));
  } else {
    likeVideo = await Like.create({ video: videoId, DislikedlikedBy: userId });
    return res.status(200).json(new APIResponse(200, likeVideo, "Video liked"));
  }
}

const toggleCommentLike = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  try {
    let commentLike = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    });
    if (commentLike) {
      await Like.findByIdAndDelete(commentLike._id);
      return res
        .status(200)
        .json(new APIResponse(200, null, "Comment unliked"));
    } else {
      commentLike = await Like.create({
        comment: commentId,
        likedBy: userId,
      });
      return res.status(200).json(new APIResponse(200, null, "Comment liked"));
    }
  } catch (error) {
    throw new APIError(501, error?.message || "ToggleLike comment failed");
  }
};

const toggleTweetLike = async (req, res) => {
  const { tweetId } = req.params;

  const userId = req.user._id;

  try {
    let tweetLike = await Like.findOne({
      tweet: tweetId,
      likedBy: userId,
    });

    if (tweetLike) {
      await Like.findByIdAndDelete(tweetLike._id);
      return res
        .status(200)
        .json(new APIResponse(200, null, "Comment unliked"));
    } else {
      tweetLike = await Like.create({ tweet: tweetId, likedBy: userId });
      return res.status(200).json(new APIResponse(200, null, "Comment liked"));
    }
  } catch (error) {
    throw new APIError(501, error?.message || "toggleLike tweet failed");
  }
};

const getLikedVideos = async (req, res) => {
  const userId = req.user?._id;

  console.log("Request User:", userId);
  
   if (!userId) {
     return res
       .status(400)
       .json(new APIResponse(400, [], "User ID is required"));
   }
  try {
    const likedVideos = await Like.aggregate([
      {
        $match: {
          likedBy: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "likedVideo",

          pipeline: [
            {
              $match: {
                isPublished: true, // to filter only published videos
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
              },
            },
            {
              $unwind: "$ownerDetails",
            },
          ],
        },
      },
      {
        $unwind: "$likedVideo",
      },

      {
        $sort: {
          "likedVideo.createdAt": -1, // Sort by video creation date
        },
      },
      {
        $project: {
          _id: 0,
          likedVideo: {
            _id: 1,
            videoFile: 1,
            thumbnail: 1,
            owner: 1,
            title: 1,
            description: 1,
            views: 1,
            duration: 1,
            createdAt: 1,
            isPublished: 1,
            ownerDetails: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        },
      },
    ]);
            
     
console.log("Liked Videos:", likedVideos);
    if (!likedVideos || likedVideos.length === 0) {
      return res
        .status(200)
        .json(new APIResponse(200, [], "No liked videos found"));
    }


    return res
      .status(200)
      .json(
        new APIResponse(200, likedVideos, "Liked videos fetched successfully")
      );
  } catch (error) {
    throw new APIError(500, error?.message || "Failed to get liked videos");
  }
};


export{toggleCommentLike,toogleVideoDislike,toggleVideoLike,getLikedVideos,toggleTweetLike }
