// @ts-nocheck
const bcrypt = require('bcrypt');

async function hashPassword(plainPassword, saltRounds = 10) {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(plainPassword, salt);
}

async function comparePassword(plainPassword, hashedPassword) {
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = { hashPassword, comparePassword };
