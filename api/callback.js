module.exports = async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/api/login');

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: '1519766493070495844',
                client_secret: 'xITCUyPFMgCxcnfqNyD47YJeLpFJrxDO',
                grant_type: 'authorization_code',
                code,
                redirect_uri: 'https://bomberscatrp.onrender.com/api/callback'
            })
        });
        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            return res.redirect('/api/login');
        }

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const userData = await userResponse.json();

        // Guardamos la cookie 'uid' con el ID de Discord del usuario (dura 7 días)
        res.cookie('uid', userData.id, { 
            httpOnly: true, 
            secure: true, 
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        // Redirigimos al menú principal de acceso
        res.redirect('/api/acceso');
    } catch (err) {
        console.error('Error en el callback de Discord:', err);
        res.redirect('/api/login');
    }
};
