import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  // Use a fallback secret for development if environment variable is missing
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';
  return jwt.sign({ id }, secret, {
    expiresIn: '30d',
  });
};

export default generateToken;
