const { parse } = require('cookie');

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    let isAdmin = false;

    try {
        const response = await fetch('http://nc.lynxnodes.es:25700/dar-rol', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                userId: cookies.uid, 
                roleId: 'TU_ID_DE_ROL_DE_DISCORD' // El rol base que se le otorga al entrar (opcional)
            })
        });
        const data = await response.json();
        isAdmin = data.isAdmin || false;
    } catch (err) {
        console.error('Error al comunicarse con el bot:', err);
    }

    res.send(`
        <html><body style="font-family:sans-serif; text-align:center; padding:50px;">
        <h1>Panel Bombers CATRP</h1>
        <div style="display:grid; gap:10px; max-width:300px; margin:auto;">
            <a href="/api/observaciones" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Observaciones</a>
            <a href="/api/sanciones" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Sanciones</a>
            <a href="/api/ascensos" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Ascensos / Descensos</a>
            <a href="/api/inactividades" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Inactividades</a>
            <a href="/api/nota_entrada" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Nota de entrada (Inicial)</a>
            
            ${isAdmin ? `<a href="/api/administracion" style="padding:15px; background:#c0392b; color:white; text-decoration:none;">Acceso Altos Cargos</a>` : ''}

            <br><a href="/api/logout">Cerrar Sesión</a>
        </div>
        </body></html>
    `);
};
