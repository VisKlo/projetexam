const pool = require('../config/database');

class User {
  static async findByEmail(email) {
    const [users] = await pool.execute(
      'SELECT id, email, password, role, first_name, last_name, is_active FROM users WHERE email = ?',
      [email]
    );
    return users[0] || null;
  }

  static async findById(id) {
    const [users] = await pool.execute(
      'SELECT id, email, role, first_name, last_name, phone, address, is_active, created_at, last_login FROM users WHERE id = ?',
      [id]
    );
    return users[0] || null;
  }

  static async create(userData) {
    const { email, password, first_name, last_name, phone, role } = userData;
    const [result] = await pool.execute(
      'INSERT INTO users (email, password, first_name, last_name, phone, role) VALUES (?, ?, ?, ?, ?, ?)',
      [email, password, first_name, last_name, phone || null, role || 'client']
    );
    return result.insertId;
  }

  static async updateLastLogin(userId) {
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [userId]
    );
  }

  static async getAll() {
    const [users] = await pool.execute(
      'SELECT id, email, role, first_name, last_name, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    return users;
  }

  static async updateRole(userId, newRole) {
    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [newRole, userId]
    );
  }

  static async delete(userId) {
    await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  }
}

module.exports = User;

