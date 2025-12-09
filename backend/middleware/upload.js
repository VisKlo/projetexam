const fs = require('fs');
const path = require('path');

// Créer les dossiers uploads/images et uploads/videos s'ils n'existent pas
const uploadImagesDir = path.join(__dirname, '../uploads/images');
const uploadVideosDir = path.join(__dirname, '../uploads/videos');
if (!fs.existsSync(uploadImagesDir)) {
  fs.mkdirSync(uploadImagesDir, { recursive: true });
}
if (!fs.existsSync(uploadVideosDir)) {
  fs.mkdirSync(uploadVideosDir, { recursive: true });
}

// Middleware d'upload pour sauvegarder les fichiers sur le disque
// Ce middleware doit être utilisé APRÈS multipartParser qui a déjà parsé le fichier
// Supporte plusieurs images (fieldname: 'images[]') et plusieurs vidéos (fieldname: 'videos[]')
const uploadMedia = (req, res, next) => {
  req.uploadedImages = [];
  req.uploadedVideos = [];

  // Gérer les images multiples
  if (req.files) {
    // Gérer les tableaux d'images (images[0], images[1], etc.)
    let imageFiles = [];
    if (Array.isArray(req.files.images)) {
      imageFiles = req.files.images;
    } else if (req.files.images) {
      imageFiles = [req.files.images];
    } else {
      // Fallback: chercher tous les fichiers qui sont des images
      imageFiles = Object.keys(req.files)
        .filter(key => req.files[key].mimetype && req.files[key].mimetype.startsWith('image/'))
        .map(key => req.files[key]);
    }
    
    for (const file of imageFiles) {
      if (!file || !file.buffer) continue;
      
      if (!file || !file.buffer) continue;
      
      // Vérifier le type de fichier pour les images
      const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
      const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
      
      if (!allowedImageTypes.test(extname) || !allowedImageTypes.test(file.mimetype)) {
        continue; // Ignorer les fichiers non valides
      }

      // Vérifier la taille (5MB max pour les images)
      const maxImageSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxImageSize) {
        continue; // Ignorer les fichiers trop volumineux
      }

      // Générer un nom de fichier unique
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const newFilename = `product-image-${uniqueSuffix}.${extname}`;
      const filepath = path.join(uploadImagesDir, newFilename);

      try {
        // Sauvegarder le fichier sur le disque
        fs.writeFileSync(filepath, file.buffer);

        // Vérifier que le fichier a été écrit
        const stats = fs.statSync(filepath);
        if (stats.size === 0) {
          fs.unlinkSync(filepath);
          continue;
        }

        req.uploadedImages.push({
          filename: newFilename,
          path: `/uploads/images/${newFilename}`,
          size: stats.size,
          mimetype: file.mimetype
        });
      } catch (error) {
        // Supprimer le fichier s'il existe
        if (fs.existsSync(filepath)) {
          try {
            fs.unlinkSync(filepath);
          } catch (e) {}
        }
        console.error('Erreur enregistrement image:', error);
      }
    }

    // Gérer les vidéos multiples
    let videoFiles = [];
    if (Array.isArray(req.files.videos)) {
      videoFiles = req.files.videos;
    } else if (req.files.videos) {
      videoFiles = [req.files.videos];
    } else {
      // Fallback: chercher tous les fichiers qui sont des vidéos
      videoFiles = Object.keys(req.files)
        .filter(key => req.files[key].mimetype && req.files[key].mimetype.startsWith('video/'))
        .map(key => req.files[key]);
    }
    
    for (const file of videoFiles) {
      if (!file || !file.buffer) continue;
      
      if (!file || !file.buffer) continue;
      
      // Vérifier le type de fichier pour les vidéos
      const allowedVideoTypes = /mp4|webm|ogg|mov|avi/;
      const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
      
      if (!allowedVideoTypes.test(extname) || !file.mimetype.startsWith('video/')) {
        continue; // Ignorer les fichiers non valides
      }

      // Vérifier la taille (50MB max pour les vidéos)
      const maxVideoSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxVideoSize) {
        continue; // Ignorer les fichiers trop volumineux
      }

      // Générer un nom de fichier unique
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const newFilename = `product-video-${uniqueSuffix}.${extname}`;
      const filepath = path.join(uploadVideosDir, newFilename);

      try {
        // Sauvegarder le fichier sur le disque
        fs.writeFileSync(filepath, file.buffer);

        // Vérifier que le fichier a été écrit
        const stats = fs.statSync(filepath);
        if (stats.size === 0) {
          fs.unlinkSync(filepath);
          continue;
        }

        req.uploadedVideos.push({
          filename: newFilename,
          path: `/uploads/videos/${newFilename}`,
          size: stats.size,
          mimetype: file.mimetype
        });
      } catch (error) {
        // Supprimer le fichier s'il existe
        if (fs.existsSync(filepath)) {
          try {
            fs.unlinkSync(filepath);
          } catch (e) {}
        }
        console.error('Erreur enregistrement vidéo:', error);
      }
    }
  }

  // Compatibilité avec l'ancien système (un seul fichier dans req.file)
  if (req.file && req.file.buffer) {
    const file = req.file;
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const isVideo = file.mimetype && file.mimetype.startsWith('video/');
    
    if (isImage && req.uploadedImages.length === 0) {
      // Si c'est une image et qu'on n'a pas déjà traité d'images
      const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
      const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
      
      if (allowedImageTypes.test(extname)) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const newFilename = `product-image-${uniqueSuffix}.${extname}`;
        const filepath = path.join(uploadImagesDir, newFilename);

        try {
          fs.writeFileSync(filepath, file.buffer);
          const stats = fs.statSync(filepath);
          if (stats.size > 0) {
            req.uploadedImages.push({
              filename: newFilename,
              path: `/uploads/images/${newFilename}`,
              size: stats.size,
              mimetype: file.mimetype
            });
          }
        } catch (error) {
          console.error('Erreur enregistrement image:', error);
        }
      }
    } else if (isVideo && req.uploadedVideos.length === 0) {
      // Si c'est une vidéo et qu'on n'a pas déjà traité de vidéos
      const allowedVideoTypes = /mp4|webm|ogg|mov|avi/;
      const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
      
      if (allowedVideoTypes.test(extname)) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const newFilename = `product-video-${uniqueSuffix}.${extname}`;
        const filepath = path.join(uploadVideosDir, newFilename);

        try {
          fs.writeFileSync(filepath, file.buffer);
          const stats = fs.statSync(filepath);
          if (stats.size > 0) {
            req.uploadedVideos.push({
              filename: newFilename,
              path: `/uploads/videos/${newFilename}`,
              size: stats.size,
              mimetype: file.mimetype
            });
          }
        } catch (error) {
          console.error('Erreur enregistrement vidéo:', error);
        }
      }
    }
  }

  next();
};

module.exports = uploadMedia;
