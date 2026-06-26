const { serialize } = require('cookie');

module.exports = async (req, res) => {
    const { code } = req.query;
    
    // 1. Intercambiar code por token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            client_id: '1519766493070495844',
            client_secret: 'xITCUyPFMgCxcnfqNyD47YJeLpFJrxDO',
            grant_type: 'authorization_code',
            code,
            redirect_uri: 'https://bomberscatrp.vercel.app/api/callback'
        })
    });
    const tokenData = await tokenResponse.json();

    // 2. Obtener datos del usuario
    const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const userData = await userResponse.json();

    // 3. Guardar el ID en una cookie llamada 'uid' que dura 30 días
    res.setHeader('Set-Cookie', serialize('uid', userData.id, { path: '/', maxAge: 60 * 60 * 24 * 30 }));
    res.redirect('/api/acceso'); // Redirige al panel
};
