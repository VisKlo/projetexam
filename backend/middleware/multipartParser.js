// Middleware global pour parser multipart/form-data avant express.json()
// Ce middleware doit être utilisé AVANT express.json() et express.urlencoded()
const busboy = require('busboy');

const multipartParser = (req, res, next) => {
  // Ne pas parser les requêtes GET ou les requêtes vers /uploads (fichiers statiques)
  // Vérifier à la fois req.path et req.url pour être sûr
  if (req.method === 'GET' || req.path.startsWith('/uploads') || req.url.startsWith('/uploads')) {
    return next();
  }
  
  const contentType = req.headers['content-type'] || '';
  
  // Si ce n'est pas multipart/form-data, passer au suivant
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  // Parser avec busboy
  const bb = busboy({ 
    headers: req.headers, 
    limits: { 
      fileSize: 50 * 1024 * 1024 // 50MB max pour les vidéos
    }
  });
  
  const fields = {};
  const files = {};
  let hasError = false;
  let errorMessage = '';
  let filesInProgress = 0;
  let filesCompleted = 0;

  // Parser les champs
  bb.on('field', (name, value) => {
    if (name.endsWith('[]')) {
      const fieldName = name.slice(0, -2);
      if (!fields[fieldName]) {
        fields[fieldName] = [];
      }
      fields[fieldName].push(value);
    } else if (fields[name]) {
      if (!Array.isArray(fields[name])) {
        fields[name] = [fields[name]];
      }
      fields[name].push(value);
    } else {
      fields[name] = value;
    }
  });

  // Parser les fichiers
  bb.on('file', (name, file, info) => {
    const { filename, mimeType } = info;
    
    if (!filename || filename === '') {
      file.resume();
      return;
    }

    filesInProgress++;
    
    // Stocker temporairement les données du fichier
    const chunks = [];
    
    file.on('data', (chunk) => {
      chunks.push(chunk);
    });

    file.on('end', () => {
      filesCompleted++;
      if (chunks.length > 0) {
        const fileData = {
          fieldname: name,
          originalname: filename,
          buffer: Buffer.concat(chunks),
          mimetype: mimeType,
          size: Buffer.concat(chunks).length
        };
        
        // Gérer les fichiers avec des noms indexés comme images[0], images[1], etc.
        if (name.includes('[') && name.includes(']')) {
          // Extraire le nom de base (ex: "images" depuis "images[0]")
          const baseName = name.substring(0, name.indexOf('['));
          if (!files[baseName]) {
            files[baseName] = [];
          }
          files[baseName].push(fileData);
        } else {
          // Pour les fichiers simples, garder la compatibilité
          files[name] = fileData;
        }
      }
      
      // Si tous les fichiers sont terminés et que busboy a fini, continuer
      checkComplete();
    });

    file.on('error', (err) => {
      hasError = true;
      errorMessage = 'Erreur lors de la lecture du fichier';
      filesCompleted++;
      checkComplete();
    });
  });

  bb.on('error', (err) => {
    hasError = true;
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorMessage = 'La taille maximale autorisée est de 5MB';
    } else {
      errorMessage = err.message || 'Erreur lors de l\'upload';
    }
    if (!res.headersSent) {
      return res.status(400).json({
        error: 'Erreur lors de l\'upload',
        details: errorMessage
      });
    }
  });

  let busboyFinished = false;
  
  bb.on('finish', () => {
    busboyFinished = true;
    checkComplete();
  });

  function checkComplete() {
    // Attendre que busboy soit terminé ET que tous les fichiers soient lus
    if (!busboyFinished || filesCompleted < filesInProgress) {
      return;
    }

    if (hasError) {
      if (!res.headersSent) {
        return res.status(400).json({
          error: 'Erreur lors de l\'upload',
          details: errorMessage
        });
      }
    }
    
    // Ajouter les champs et fichiers à req
    req.body = fields;
    req.files = files;
    
    // Si un fichier a été uploadé, le mettre dans req.file pour compatibilité
    const fileKeys = Object.keys(files);
    if (fileKeys.length > 0) {
      req.file = files[fileKeys[0]];
    }
    
    next();
  }

  // Parser la requête
  req.pipe(bb);
};

module.exports = multipartParser;

