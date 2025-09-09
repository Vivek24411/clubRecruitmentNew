const jwt = require("jsonwebtoken");
const clubModel = require("../models/club.model");
const studentModel = require("../models/student.model");

module.exports.adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json({ success: false, msg: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.json({ success: false, msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.email !== process.env.ADMIN_EMAIL) {
      return res.json({ success: false, msg: "Forbidden" });
    }
    req.admin = decoded;
    next();
  } catch (err) {
    return res.json({ success: false, msg: "Invalid token" });
  }
}

module.exports.clubAuth = async(req, res, next) => {
  console.log('hii');
  
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json({ success: false, msg: "No token provided" });
  }

  console.log(authHeader);
  

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.json({ success: false, msg: "No token provided" });
  }

  console.log(token);
  

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);

    const club = await clubModel.findById(decoded.id);
    console.log(club);
    
    if (!club) {
      return res.json({ success: false, msg: "Club not found" });
    }
    req.club = club;
    console.log('hii');
    
    next();
  } catch (err) {
    return res.json({ success: false, msg: err.message || "Invalid token" });
  }
}

module.exports.studentAuth = async(req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.json({ success: false, msg: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.json({ success: false, msg: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const student = await studentModel.findById(decoded.id);
    if (!student) {
      return res.json({ success: false, msg: "Student not found" });
    }
    req.student = student ;
    next();
  } catch (err) {
    return res.json({ success: false, msg: "Invalid token" });
  }
}