const express = require("express");
const { User } = require("./models");
const cors = require("cors");
const bcrypt = require("bcrypt"); // For password hashing
const jwt = require("jsonwebtoken"); // For generating JWT tokens
const app = express();
const port = 3000;

const SECRET_KEY = "your_secret_key"; // Use a secure key for JWT

app.use(cors());
app.use(express.json());

// Register a new user
app.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (typeof firstName === "undefined") missingFields.push("firstName");
  if (typeof lastName === "undefined") missingFields.push("lastName");
  if (typeof email === "undefined") missingFields.push("email");
  if (typeof password === "undefined") missingFields.push("password");

  // If there are missing fields, return an error
  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `The following fields are missing or undefined: ${missingFields.join(
        ", "
      )}`,
    });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    res
      .status(201)
      .json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login a user
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, {
      expiresIn: "1h", // Token expires in 1 hour
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Example route to get user profile (Requires valid JWT token)
app.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer token
  console.log(token);

  if (!token)
    return res.status(401).json({ error: "Access denied, no token provided" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user; // Add user information to the request object
    next();
  });
}

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
