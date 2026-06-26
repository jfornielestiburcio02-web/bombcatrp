module.exports = (req, res) => {
    // Para borrar las cookies, las "reescribimos" con una fecha de expiración antigua (1970)
    const expired = 'Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    res.setHeader('Set-Cookie', [
        `uid=${expired}`,
        `username=${expired}`
    ]);

    // Redirige a la página principal
    res.redirect('/');
};
