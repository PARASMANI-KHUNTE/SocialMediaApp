const express = require("express");
const multer = require("multer");
const { initializeApp } = require("firebase/app");
const {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} = require("firebase/storage");
const { v4: uuidv4 } = require("uuid");
const app = express();
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");
const cookieParser = require("cookie-parser");
const admin = require("firebase-admin");

dotenv.config();
app.use(express.json());
app.use(cookieParser());

const serviceAccount = require("./myapp-dc057-firebase-adminsdk-pnbk8-85b01914f6.json");
const { default: firebase } = require("firebase/compat/app");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

const bucket = admin.storage().bucket();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};
const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

const port = process.env.PORT || 3000;
const secretKey = process.env.JWT_SECRET;
const dbName = process.env.DB_NAME;

mongoose
  .connect(`${process.env.MONGODB_URI}/${dbName}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MONGODB ATLAS is CONNECTED :)");
  })
  .catch((error) => {
    console.error("MONGODB ATLAS Failed to connect :(", error);
  });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String },
  bannerUrl: { type: String },
  followers: { type: Number, default: 0 },
  following: { type: Number, default: 0 },
});

const User = mongoose.model("User", userSchema);

const postSchema = new mongoose.Schema({
  PostUniqueName: { type: String, required: true },
  Title: { type: String, required: true },
  Decs: { type: String, required: true },
  Media: { type: String },
  PostUrl: { type: String },
  PostDate: { type: String, required: true },
  PostBy: { type: String, required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
});

const Post = mongoose.model("Post", postSchema);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/signup", async (req, res) => {
  try {
    const existingUser = await User.findOne({
      $or: [{ username: req.body.username }, { email: req.body.email }],
    });

    if (existingUser) {
      return res.status(409).send("Username or Email Already Exists");
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const newUser = new User({
      name: req.body.name,
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
    });
    await newUser.save();

    res.status(201).send("User Created Successfully!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(401).send("Invalid username or password");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send("Invalid username or password");
    }

    const payload = { username: user.username };
    const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });

    res.cookie("token", token, { httpOnly: true });
    res.status(200).json({ username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send("UnAuthorized ");
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }
};

app.get("/home", verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "home.html"));
});
app.get("/index", verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/profilepage", verifyToken, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "profile.html"));
});

app.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .send("No file uploaded. Please select a file to upload."); // Clearer error message
  }

  const PostTitle = req.body.postTitle;
  const PostDesc = req.body.postDesc;
  const MediaType = req.body.mediaType;
  const date = new Date();
  postDateAndTime = date.toLocaleString();
  const currentUser = req.user.username;
  const file = req.file;
  const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
  const uniqueText = `${uuidv4()}`;
  const storageRef = ref(storage, uniqueName);

  if (!file) {
    try {
      const newPost = new Post({
        PostUniqueName: uniqueText,
        Title: PostTitle,
        Decs: PostDesc,
        Media: MediaType,
        PostDate: postDateAndTime,
        PostBy: currentUser,
        views: 0,
        likes: 0,
      });
      await newPost.save();

      res.status(200).send("File uploaded successfully.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading file. ");
    }
  } else {
    try {
      await uploadBytes(storageRef, file.buffer);
      const downloadURL = await getDownloadURL(storageRef);

      const newPost = new Post({
        PostUniqueName: uniqueName,
        Title: PostTitle,
        Decs: PostDesc,
        Media: MediaType,
        PostUrl: downloadURL,
        PostDate: postDateAndTime,
        PostBy: currentUser,
        views: 0,
        likes: 0,
      });

      await newPost.save();

      res.status(200).send("File uploaded successfully.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error uploading file.");
    }
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(200).send("Logout successful");
});

// Get User Profile Info
app.get("/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).select(
      "-password"
    );
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.put(
  "/profile",
  verifyToken,
  upload.fields([{ name: "avatar" }, { name: "banner" }]),
  async (req, res) => {
    try {
      const updates = req.body;
      const files = req.files;
      const user = await User.findOne({ username: req.user.username });

      if (!user) {
        return res.status(404).send("User not found");
      }

      // Function to delete file from Firebase Storage
      const deleteFileFromFirebase = async (fileUrl) => {
        if (fileUrl) {
          try {
            const filePath = decodeURIComponent(
              fileUrl
                .split("?")[0]
                .replace(
                  "https://firebasestorage.googleapis.com/v0/b/myapp-dc057.appspot.com/o/",
                  ""
                )
            );
            await bucket.file(filePath).delete();
            console.log(`File ${filePath} deleted from Firebase Storage.`);
          } catch (error) {
            console.error(`Error deleting file ${fileUrl}:`, error);
          }
        }
      };

      if (files.avatar) {
        // Delete old avatar if it exists
        if (user.avatarUrl) {
          await deleteFileFromFirebase(user.avatarUrl);
        }

        // Upload new avatar
        const avatarRef = ref(
          storage,
          `avatars/${uuidv4()}${path.extname(files.avatar[0].originalname)}`
        );
        await uploadBytes(avatarRef, files.avatar[0].buffer);
        updates.avatarUrl = await getDownloadURL(avatarRef);
      }

      if (files.banner) {
        // Delete old banner if it exists
        if (user.bannerUrl) {
          await deleteFileFromFirebase(user.bannerUrl);
        }

        // Upload new banner
        const bannerRef = ref(
          storage,
          `banners/${uuidv4()}${path.extname(files.banner[0].originalname)}`
        );
        await uploadBytes(bannerRef, files.banner[0].buffer);
        updates.bannerUrl = await getDownloadURL(bannerRef);
      }

      const updatedUser = await User.findOneAndUpdate(
        { username: req.user.username },
        updates,
        { new: true }
      ).select("-password");
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal Server Error");
    }
  }
);

// Fetch all posts with pagination
app.get("/all-posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10; // Number of posts to fetch per page
  const skip = (page - 1) * limit;

  try {
    const posts = await Post.find().sort({ PostDate: -1 }).skip(skip).limit(limit);
    res.status(200).json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});



app.get("/posts", verifyToken, async (req, res) => {
  try {
  const posts = await Post.find({ PostBy: req.user.username });
  res.status(200).json(posts);
  } catch (error) {
  console.error(error);
  res.status(500).send("Internal Server Error");
  }
  });
  

// Edit Post
app.put("/posts/:id", verifyToken, async (req, res) => {
  try {
    const updates = req.body;
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, PostBy: req.user.username },
      updates,
      { new: true }
    );
    if (!post) {
      return res.status(404).send("Post not found");
    }
    res.status(200).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.delete("/posts/:id", verifyToken, async (req, res) => {
  try {
    // Find the post
    const post = await Post.findOne({
      _id: req.params.id,
      PostBy: req.user.username,
    });
    if (!post) {
      return res.status(404).send("Post not found");
    }
    // Function to delete file from Firebase Storage
    const deleteFileFromFirebase = async (fileUrl) => {
      if (fileUrl) {
        try {
          const filePath = decodeURIComponent(
            fileUrl
              .split("?")[0]
              .replace(
                "https://firebasestorage.googleapis.com/v0/b/myapp-dc057.appspot.com/o/",
                ""
              )
          );
          await bucket.file(filePath).delete();
          console.log(`File ${filePath} deleted from Firebase Storage.`);
        } catch (error) {
          console.error(`Error deleting file ${fileUrl}:`, error);
        }
      }
    };
    // Check if the post has a media URL
    if (post.PostUrl) {
      // Ensure you're checking the correct field
      deleteFileFromFirebase(post.PostUrl);
    }

    // Delete the post from the database
    await Post.findOneAndDelete({
      _id: req.params.id,
      PostBy: req.user.username,
    });
    res.status(200).send("Post and associated media deleted successfully");
  } catch (error) {
    console.error("Error deleting post or associated media:", error);
    res.status(500).send("Internal Server Error");
  }
});






app.get('/api/avatar/:username',verifyToken,async (req, res) => {
  const { username } = req.params;

  try {
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const avatarUrl = user.avatarUrl; // Assuming the property is 'avatarUrl'
    if (!avatarUrl) {
      return res.status(200).send('User has no avatar URL'); // Or provide a default URL
    }

    res.status(200).send({ avatarUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.put("/like",verifyToken ,(req,res)=>{
    const post =  Post.findOne()
})

app.listen(port, () =>
  console.log(`Server listening on port http://localhost:${port}`)
);
