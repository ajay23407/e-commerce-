const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

const router = express.Router();

// store temp file
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path);

    res.json({
      url: result.secure_url
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;