import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import dotenv from "dotenv";
import path from "path";
// Load environment variables from .env file
dotenv.config();


    // Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
})
 
 
const uploadCloudinary = async (localFilePath) => {
  

  try {
    if (!localFilePath) {
      console.warn("No file path provided");
      return null;
    }

    const resolvedPath = path.resolve(localFilePath); // Ensure a full path
    console.log("Resolved Cover Photo File Path:", resolvedPath);

    // Ensure the file exists before uploading
    if (!fs.existsSync(resolvedPath)) {
      console.error("File does not exist at path:", resolvedPath);
      return null;
    }

    // Upload the file to Cloudinary
  

    const response = await cloudinary.uploader.upload(resolvedPath, {
      resource_type: "auto",
      folder: "public/upload",
    });
    // file has been uploaded successfull

    fs.unlinkSync(resolvedPath);
    // Remove the local file after successful upload

    return response;
  } catch (error) {
      console.error('Cloudinary upload error: ', error);

    if (fs.existsSync(localFilePath)) {
      // Remove the local file even if the upload fails
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
   
  }

    



const deleteImageCloudinary = async (publicId) => {
  try {
    // Perform the delete operation and wait for the result
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Cloudinary delete result:", result);
    
    // Check if the deletion was successful
    if (result.result !== "ok" && result.result !== "not found") {
      throw new Error(`Failed to delete image: ${result.error || "Unknown error"}`);
      }
    return result;
  } catch (error) {
    // Log the error and throw a new error with a descriptive message
    console.error("Cloudinary deletion error:", error);
    throw new Error(`Error while deleting from Cloudinary: ${error.message}`);
  }
  
}


const uploadVideoOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
 
    

    //Uploading File to Cloudinary
    const cldnry_res = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "video",
      folder: "public/upload",
    });

    // File Uploaded Successfully & Removing File From Local System
    fs.unlinkSync(localFilePath);

    return cldnry_res;
  } catch (error) {
    fs.unlinkSync(localFilePath); //Removing File From Local System
    console.log("CLOUDINARY :: FILE UPLOAD ERROR ", error);
    return null;
  }
};


const deleteVideoOnCloudinary = async (publicId) => {
  try {
     if (!publicId) {
       throw new Error("Missing required parameter - public_id");
     }


    // Deleting File from Cloudinary
     try {
       await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
       console.log(`Video with public_id ${publicId} deleted from Cloudinary`);
     } catch (error) {
       console.error("Error while deleting from Cloudinary:", error);
       throw new Error(
         "Error while deleting from Cloudinary: " + error.message
       );
     }
  
 
    
   
  } catch (error) {
    console.log("CLOUDINARY :: FILE DELETE ERROR ", error);
        fs.unlinkSync(publicId);
    return null;
  }
};



export {
  deleteImageCloudinary,
  uploadVideoOnCloudinary,
  deleteVideoOnCloudinary,
  uploadCloudinary
};