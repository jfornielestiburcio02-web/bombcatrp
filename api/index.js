const { parse } = require('cookie');

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    
    // Si no tiene la cookie 'uid', redirige al login
    if (!cookies.uid) {
        return res.redirect('/api/login');
    }

    // Si estás aquí, el usuario está autenticado. 
    // Para redirigir a la raíz desde el servidor usa esto:
    return res.redirect('/');
};
