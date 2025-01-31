module.exports = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.session.user || !allowedRoles.includes(req.session.user.role)) {
            return res.status(403).json({ message: 'Unauthorized access' });
        }
        next();
    };
};
