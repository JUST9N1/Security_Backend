module.exports = (req, res, next) => {
    if (!req.session || !req.session.user || !req.session.user.id) {
        return res.status(401).json({ message: 'Unauthorized. Please log in.' });
    }

    // Attach user session data to `req.user` for controllers
    req.user = req.session.user;

    next();
};
