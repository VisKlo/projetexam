const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce_artisanat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});


// Test de connexion amélioré
async function testConnection() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'ecommerce_artisanat';
  
  const hostsToTry = dbHost === 'localhost' ? ['localhost', '127.0.0.1'] : [dbHost];
  
  for (const host of hostsToTry) {
    try {
      const testConnection = await mysql.createConnection({
        host: host,
        port: dbPort,
        user: dbUser,
        password: dbPassword,
        connectTimeout: 5000 // 5 secondes de timeout
      });
      
      const [databases] = await testConnection.execute(
        "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?",
        [dbName]
      );
      
      if (databases.length === 0) {
        console.error(`❌ La base de données "${dbName}" n'existe pas encore`);
        console.error('   Créez-la via phpMyAdmin ou importez database/schema.sql');
        await testConnection.end();
        return; // On arrête ici, la base n'existe pas
      }
      
      await testConnection.end();
      
      // Maintenant testons la connexion avec la base via le pool
      const connection = await pool.getConnection();
      console.log('✅ Connexion à la base de données MySQL réussie');
      connection.release();
      return;
      
    } catch (error) {
      if (host === hostsToTry[hostsToTry.length - 1]) {
        // Dernière tentative, afficher l'erreur
        console.error('❌ Erreur de connexion à la base de données:');
        console.error('   Message:', error.message || error.toString());
        console.error('   Code:', error.code);
        
        if (error.code === 'ECONNREFUSED') {
          console.error('\n💡 ECONNREFUSED signifie que MySQL n\'est pas accessible:');
          console.error('\n📋 Vérifications à faire:');
          console.error('   1. Ouvrez le Panneau de Contrôle XAMPP');
          console.error('   2. Vérifiez que MySQL est démarré (bouton "Start" vert)');
          console.error('   3. Si MySQL ne démarre pas, vérifiez les logs dans XAMPP');
          console.error('   4. Testez dans phpMyAdmin: http://localhost/phpmyadmin');
          console.error('      → Si phpMyAdmin fonctionne, MySQL est démarré');
          console.error('      → Si phpMyAdmin ne fonctionne pas, MySQL n\'est pas démarré');
          console.error('\n🔧 Si MySQL est démarré mais ne répond toujours pas:');
          console.error('   - Vérifiez le port MySQL dans XAMPP (Config → my.ini)');
          console.error('   - Par défaut, MySQL écoute sur le port 3306');
          console.error('   - Essayez de changer DB_HOST=127.0.0.1 dans votre .env');
        } else if (error.code === 'ER_BAD_DB_ERROR') {
          console.error('\n💡 La base de données n\'existe pas:');
          console.error('   1. Ouvrez phpMyAdmin: http://localhost/phpmyadmin');
          console.error('   2. Créez la base de données: ' + dbName);
          console.error('   3. Importez le fichier: database/schema.sql');
        } else if (error.code === 'ER_PARSE_ERROR') {
          console.error('\n💡 Erreur de syntaxe SQL:');
          console.error('   Cette erreur ne devrait pas se produire. Contactez le support.');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
          console.error('\n💡 Problème d\'authentification:');
          console.error('   1. Vérifiez le nom d\'utilisateur (par défaut: root)');
          console.error('   2. Vérifiez le mot de passe (vide pour XAMPP par défaut)');
          console.error('   3. Vérifiez dans phpMyAdmin les identifiants MySQL');
        } else {
          console.error('   Vérifiez que:');
          console.error('   1. MySQL/XAMPP est démarré');
          console.error('   2. La base de données "' + dbName + '" existe');
          console.error('   3. Les paramètres dans .env sont corrects');
        }
      } else {
        // Ce n'est pas la dernière tentative, continuer
        continue;
      }
    }
  }
}

testConnection();

module.exports = pool;

