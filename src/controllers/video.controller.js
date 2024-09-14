import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
import { stopWords } from "../utils/stopWords.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import {

  deleteImageCloudinary,
  deleteVideoOnCloudinary,
  uploadCloudinary,
uploadVideoOnCloudinary 
} from "../utils/cloudinary.js";

const getAllVideosByOption = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      sortBy = "createdAt",
      order = -1,
      userId,
    } = req.query;

    // Define initial filters (for published videos)
    let filters = { isPublished: true };

    // Filter by userId if provided
    if (userId && mongoose.isValidObjectId(userId)) {
      filters.owner =new mongoose.Types.ObjectId(userId);
    }

    // Initialize aggregation pipeline
    let pipeline = [{ $match: filters }];

    // Apply search filter
    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } },
          ],
        },
      });
    }

    // Use $lookup to join with user collection and project needed fields
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$owner" } // Flatten the user details
    );

    // Apply sorting by the specified field
    pipeline.push({ $sort: { [sortBy]: parseInt(order,10) } });

    // Execute the aggregation with pagination
    const videoAggregate = Video.aggregate(pipeline);
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    const allVideos = await Video.aggregatePaginate(videoAggregate, options);
    const { docs, ...pagingInfo } = allVideos;

    // Return the paginated response
    return res
      .status(200)
      .json(
        new APIResponse(
          200,
          { videos: docs, pagingInfo },
          "All Query Videos Sent Successfully"
        )
      );
  } catch (error) {
    console.error("Error fetching videos:", error.message);
    return res.status(500).json({ error: error.message });
  }
};



  const getAllVideos =async (req, res) => {
    const { userId } = req.query;

    let filters = { isPublished: true };
    if (isValidObjectId(userId))
      filters.owner = new mongoose.Types.ObjectId(userId);

    let pipeline = [
      {
        $match: {
          ...filters,
        },
      },
    ];

    pipeline.push({
      $sort: {
        createdAt: -1,
      },
    });

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                username: 1,
                fullName: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$owner",
      }
    );

    const allVideos = await Video.aggregate(Array.from(pipeline));

    return res
      .status(200)
      .json(new APIResponse(200, allVideos, "all videos sent"));
  };

const publishAVideo = async (req, res) => {
   console.log("Files received:", req.files); // Log the received files
  console.log("Body received:", req.body); 
  
  const { title, description } = req.body;

  if (!title) throw new APIError(400, "Title is Required");
  
  // fetch local video file path
  let videoFileLocalFilePath = null;
  if (req.files && req.files?.videoFile && req.files?.videoFile?.length > 0) {
    videoFileLocalFilePath = req.files?.videoFile?.[0]?.path;
  } else {
    throw new APIError(400, "Video File Must be Required");
  }
  
  // fetch local thumbnail file path
  let thumbnailLocalFilePath = null;

  if (req.files && req.files?.thumbnail && req.files?.thumbnail?.length > 0) {
    thumbnailLocalFilePath = req.files?.thumbnail?.[0]?.path;
  } else {
    throw new APIError(400, "Thumbnail File Must be Required");
  }


const videoFile = await uploadVideoOnCloudinary (videoFileLocalFilePath);
  if (!videoFile) throw new APIError(500, "Error while Uploading Video File");
  

 const thumbnailFile = await uploadCloudinary(thumbnailLocalFilePath);
 if (!thumbnailFile)
    throw new APIError(500, "Error while uploading thumbnail file");
  
  
  const video = await Video.create({
    videoFile: videoFile.url,
    title,
    description: description || "",
    duration: videoFile.duration,
    thumbnail: thumbnailFile.url,
    owner: req.user?._id,
  });

  if (!video) throw new APIError(500, "Error while Publishing Video");


 return res
    .status(200)
    .json(new APIResponse(200, video, "Video published successfully"));
  
}

const updateVideo = async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  // Validations
  if (!isValidObjectId(videoId)) throw new APIError(400, "Invalid VideoId...");

  const thumbnailLocalFilePath = req.file?.path;

  if (!title && !description && !thumbnailLocalFilePath) {
    throw new APIError(400, "At-least one field required");
  }

  // check only owner can modify video
  const video = await Video.findById(videoId);
  if (!video) throw new APIError(404, "video not found");

  if (video.owner.toString() !== req.user?._id.toString())
    throw new APIError(401, "Only owner can modify video details");

  //Update based on data sent
  let thumbnail;
  if (thumbnailLocalFilePath) {
    thumbnail = await uploadCloudinary (thumbnailLocalFilePath);
    if (!thumbnail)
      throw new APIError(500, "Error accured while uploading photo");

    await deleteImageCloudinary(video.thumbnail);
  }
 if (title) video.title = title;
 if (description) video.description = description;
 if (thumbnail) video.thumbnail = thumbnail.url;


 // Save in database
  const updatedVideo = await video.save({ validateBeforeSave: false });

  if (!updatedVideo) {
    throw new APIError(500, "Error while Updating Details");
  }

  return res
    .status(200)
    .json(new APIResponse(200, updatedVideo, "Video updated successfully"));

}

const deleteVideo = async (req, res) => {
  const { videoId } = req.params;
  console.log("Received videoId:", videoId);

  if (!isValidObjectId(videoId)) {
    console.log("Invalid videoId format");
    return res.status(400).json({ error: "Invalid videoId format" });
  }

  try {
    // Find the video to be deleted
    const currentVideo = await Video.findById(videoId);
    if (!currentVideo) {
      console.log("Video not found");
      throw new APIError(404, "Video not found");
    }

    // Delete video document from MongoDB
    const deleteResult = await Video.findByIdAndDelete(videoId);
    if (!deleteResult) {
      console.log("Video deletion failed");
      throw new APIError(500, "Video deletion failed");
    }

    console.log("Video successfully deleted");

    // delete video likes, comments, and cloudinary files in parallel
    await Promise.all([
      Like.deleteMany({ video: videoId }),
      Comment.deleteMany({ video: videoId }),
      currentVideo?.video?.fileId
        ? deleteVideoOnCloudinary(currentVideo.video.fileId)
        : Promise.resolve(),
      currentVideo?.thumbnail?.fileId
        ? deleteImageCloudinary(currentVideo.thumbnail.fileId)
        : Promise.resolve(),
    ]);

    return res
      .status(200)
      .json(new APIResponse(200, null, "Video deleted successfully"));
  } catch (error) {
    console.error("Error deleting video:", error);
    return res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
};




const togglePublishStatus = async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) throw new APIError(400, "videoId required");

  const video = await Video.findById(videoId);

  if (!video) throw new APIError(404, "Video not found");

  video.isPublished = !video.isPublished;

  await video.save({ validateBeforeSave: false });
  const updatedVideo = await video.save();

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { isPublished: updatedVideo.isPublished },
        "Video toggled successfully"
      )
    );
};


const getNextVideos = async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) throw new APIError(400, "Invalid videoId");
  

  const video = await Video.findById(videoId);


  if (!video) throw new APIError(404, "Video not found");


  const nextVideos = await Video.aggregate([
    {
      $match: {
        _id: {
          $ne: new mongoose.Types.ObjectId(videoId),
        },
        isPublished: true,
      },
    },

    {
      $sample: {
        size: 10,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },

    {
      $unwind: "$ownerDetails",
    },
  ]);
 return res
   .status(200)
   .json(new APIResponse(200, nextVideos, "Next videos fetched successfully"));
}


const updateVideoViews = async (req, res) => {
  const { videoId } = req.params;

  console.log("Received videoId:", videoId); // Log the videoId to debug

  if (!isValidObjectId(videoId)) throw new APIError(400, "Invalid videoId");

  const video = await Video.findById(videoId);
  if (!video) throw new APIError(400, "Video not found");

  video.views += 1;
  const updatedVideo = await video.save();
  if (!updatedVideo) throw new APIError(400, "Error occurred on updating view");

  return res
    .status(200)
    .json(
      new APIResponse(
        200,
        { isSuccess: true, views: updatedVideo.views },
        "Video views updated successfully"
      )
    );
};




const getVideoByIdForGuest = async (req, res) => {
   const { videoId } = req.params;

    if (!videoId?.trim()) throw new APIError(400, "Video Id is missing");
  
  if (!isValidObjectId(videoId)) throw new APIError(400, "Invalid VideoID");
  

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: false,
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              subscribersCount: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: false,
      },
    },
    {
      $project: {
        "video.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
        isSubscribed: 1,
      },
    },
  ]);

  if (!video) throw new APIError(404, "Video not found");

  return res.status(200).json(new APIResponse(200, video[0], "Video found"));



  
}



export const getVideoById =async (req, res) => {
  const { videoId } = req.params;
 //console.log("getVideoById triggered", req.params);
  if (!isValidObjectId(videoId)) {
    throw new APIError(400, "Invalid video id");
  }

   const video = await Video.aggregate([
     {
       $match: {
         _id: new mongoose.Types.ObjectId(videoId),
       },
     },
     {
       $lookup: {
         from: "likes",
         localField: "_id",
         foreignField: "video",
         as: "likes",
       },
     },
     {
       $lookup: {
         from: "users",
         localField: "owner",
         foreignField: "_id",
         as: "owner",
         pipeline: [
           {
             $lookup: {
               from: "subscriptions",
               localField: "_id",
               foreignField: "channel",
               as: "subscribers",
             },
           },
           {
             $addFields: {
               subscribersCount: {
                 $size: "$subscribers",
               },
               isSubscribed: {
                 $cond: {
                   if: {
                     $in: [req.user?._id, "$subscribers.subscriber"],
                   },
                   then: true,
                   else: false,
                 },
               },
             },
           },
           {
             $project: {
               username: 1,
               fullName: 1,
               avatar: "$avatar",
               subscribersCount: 1,
               isSubscribed: 1,
             },
           },
         ],
       },
     },
     {
       $addFields: {
         likesCount: {
           $size: "$likes",
         },
         owner: {
           $first: "$owner",
         },
         isLiked: {
           $cond: {
             if: { $in: [req.user?._id, "$likes.likedBy"] },
             then: true,
             else: false,
           },
         },
       },
     },

     {
       $project: {
         url: "$videoFile",
         title: 1,
         description: 1,
         views: 1,
         createdAt: 1,
         duration: 1,
         comments: 1,
         owner: 1,
         likesCount: 1,
         isLiked: 1,
         isSubscribed: 1,
         subscribersCount: 1,
       },
     },
   ]);

   if (!video.length) throw new APIError(404, "Video not found");

   return res.status(200).json(new APIResponse(200, video[0], "Video found"));
};





export {
  getAllVideosByOption,
  getAllVideos,
  publishAVideo,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  getNextVideos,
  updateVideoViews,
getVideoByIdForGuest,
}