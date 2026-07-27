const { parse } = require('cookie');

module.exports = async (req, res) => {
    const cookies = parse(req.headers.cookie || '');
    if (!cookies.uid) return res.redirect('/api/login');

    let isAdmin = false;

    try {
        const response = await fetch('http://nc.lynxnodes.es:25700/verificar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: cookies.uid })
        });
        const data = await response.json();
        isAdmin = data.isAdmin || false;
    } catch (err) {
        console.error('Error al verificar el rol de administración:', err);
    }

    // Si intenta entrar por URL pero no tiene el rol, lo mandamos al panel general
    if (!isAdmin) {
        return res.redirect('/api/acceso');
    }

    // Si es administrador, se muestra el panel de altos cargos
    res.send(`
        <html><body style="font-family:sans-serif; text-align:center; padding:50px;">
        <h1>Panel de Altos Cargos</h1>
        <div style="display:grid; gap:10px; max-width:320px; margin:auto;">
            <a href="/api/admin/gestionarFal" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Gestionar Faltas de asistencia</a>
            <a href="/api/admin/ponFal" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Sancionar a un usuario</a>
            <a href="/api/admin/eliPonInfo" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Informes (Visualizar y eliminar)</a>
            <a href="/api/admin/comunicAdos" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Comunicados desde la plataforma</a>
            <a href="/api/admin/verServiciosTodos" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;"> Servicios, tasas y resúmenes</a>
            <a href="/api/admin/otros" style="padding:15px; background:#2c3e50; color:white; text-decoration:none;">Otras opciones</a>
            <br>
            <a href="/api/acceso" style="padding:15px; background:#7f8c8d; color:white; text-decoration:none;">Volver al panel general</a>
        </div>
        </body></html>
    `);
};
