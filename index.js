import express from "express"
import dataBase from "./src/config/dataBase.js"
import cors from "cors"
import dotenv from "dotenv";
import cookieParser from "cookie-parser"
dotenv.config();

const app = express()
dataBase()



//middlewares


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://videostream-frontend.vercel.app",
      "https://videostream-frontend-gsc5w0c9x-sandeepreddys-projects.vercel.app",
      "https://videostream-frontend-i3je62v37-sandeepreddys-projects.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);



console.log("url", process.env.FRONTEND_URL);

app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())





//routes import
import userRouter from "./src//routes/user.routes.js";
import videoRouter from "./src/routes/video.routes.js";
import likeRouter from "./src/routes/like.routes.js";
import commentRouter from "./src/routes/comment.routes.js";
import dashboardRouter from "./src/routes/dashboard.routes.js";
import subscriptionRouter from "./src/routes/subscription.routes.js";
import playlistRouter from "./src/routes/playlist.routes.js";
import { APIError } from "./src/utils/APIError.js";
import { verifyJWT } from "./src/middleware/auth.middleware.js";





// routes declaration
// http://localhost:6000/api/v1/users/register

app.use("/api/v1/users",userRouter)
app.use("/api/v1/video", videoRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/playlist", playlistRouter);
// Protected route
app.use('/protected', verifyJWT, (req, res) => {
    res.json({ message: 'This is protected data' });
});

app.get("/apple", (req, res) => {
  res.send("Server is up and running");
});
// Error handling middleware in Express
app.use((err, req, res, next) => {
    console.error("Backend Error:", err);
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  res.status(500).json({
    error: "An unexpected error occurred",
  });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT,() => {
    console.log(`app is running on ${PORT}`)
})