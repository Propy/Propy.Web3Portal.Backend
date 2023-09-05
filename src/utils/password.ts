const bcrypt = require('bcrypt');
const saltRounds = 10;

export const generateSaltedAndHashed = async (plaintext: string) => {
  return new Promise((resolve, reject) => {
      bcrypt.hash(plaintext, saltRounds, function(err: any, hash: string) {
          if (err) reject();
          resolve(hash);
      });
  });
}

export const verifyPassword = async (plaintext: string, saltedAndHashed: string) => {
  return await bcrypt.compare(plaintext, saltedAndHashed);
}