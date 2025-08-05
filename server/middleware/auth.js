import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  // ดึง token จาก header ที่ส่งมาในรูปแบบ "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // แปลง userId เป็น id เพื่อความสอดคล้อง
    req.user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    
    console.log('Authenticated user:', req.user);
    next();
  });
}