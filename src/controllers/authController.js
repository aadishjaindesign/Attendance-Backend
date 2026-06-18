const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


const registerUser = async (req, res) => {
  try {

    const {
      name,
      email,
      password,
      role,
      phone,
      employeeId,
      department,
      designation,
    } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      employeeId,
      department,
      designation,
      status: "pending",
    });

    res.status(201).json({
      message: "User Registered Successfully",
      user,
    });

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Login 
console.log("JWT_SECRET =", process.env.JWT_SECRET);
const loginUser = async (req, res) => {
  console.log("LOGIN HIT");
  console.log("BODY =", req.body);

  try {
 
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Invalid Email",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        message: "Invalid Password",
      });
    }

    // 🔴 IMPORTANT FIX (ADMIN APPROVAL CHECK)
    if (user.role === "employee" && user.status !== "approved") {
      return res.status(403).json({
        message: "Account not approved by admin yet",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user,
    });

  } catch (error) {
  console.error("LOGIN ERROR:", error);

  res.status(500).json({
    message: error.message,
    stack: error.stack,
  });
}
};

module.exports = {
  registerUser,
  loginUser,
};