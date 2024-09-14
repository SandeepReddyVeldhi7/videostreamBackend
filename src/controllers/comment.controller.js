import mongoose ,{isValidObjectId} from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { APIError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";

const getVideoComments = async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const isGuest = req.query.guest === "true";
    
    if (!isValidObjectId(videoId)) throw new APIError(401, "Invalid VideoID");
    const video = await Video.findById(videoId);
    if (!video) throw new APIError(404, "Video not found");


    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
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
                        if: isGuest,
                        then: false,
                        else: {
                            $cond: {
                                if: { $in: [req.user?._id, "$likes.likedBy"] },
                                then: true,
                                else: false,
                            },
                        },
                    },
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                    _id: 1,
                },
                isLiked: 1,
            },
        },
    ]);
    if (!commentsAggregate) {
        throw new APIError(500, "Error creating comments aggregate");
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    if (!comments) throw new APIError(501, "Comments Pagination failed");

    return res
        .status(200)
        .json(
            new APIResponse(200, comments, "Video Comments fetched Successfully")
        );
};

const addComment =async (req, res) => {
  const { videoId } = req.params;
    const { content } = req.body;
    
    if (!content) throw new APIError(404, "Comment content is required");
    
  const video = await Video.findById(videoId);

    if (!video) throw new APIError(404, "Video not found");
    
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  if (!comment) throw new APIError(500, "Error adding comment");

  return res.status(200).json(new APIResponse(200,  {
    commentId: comment._id,
    content: comment.content,
    commentOwner:comment.owner._id
  }, "Comment added"));
};

const updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body; // Ensure content is directly extracted

  if (!content) throw new APIError(404, "Comment content is required");

  if (!isValidObjectId(commentId)) {
    throw new APIError(400, "Invalid comment Id");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new APIError(404, "Comment not found");
  }

 

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { $set: { content } },
    { new: true }
  );
  if (!updatedComment) throw new APIError(500, "Error updating comment");

  return res
    .status(200)
    .json(new APIResponse(200, updatedComment, "Comment updated"));
};


const deleteComment =async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!isValidObjectId(commentId))
    throw new APIError(401, "Invalid Comment ID");

  const comment = await Comment.findById(commentId);

  if (!comment) throw new APIError(404, "Comment not found");

  if (comment?.owner.toString() !== userId.toString()) {
    throw new APIError(400, "only owner can delete their Comment");
  }
  // Delete the comment
  await Comment.findByIdAndDelete(commentId);

  return res.status(200).json(new APIResponse(200, null, "Comment deleted"));
};



export { getVideoComments, addComment, updateComment, deleteComment };