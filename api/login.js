module.exports = (req, res) => {
    const client_id = '1519766493070495844'; // Pon aquí tu Client ID
    const redirect_uri = 'https://bomberscatrp.vercel.app/api/callback';
    const url = `https://discord.com/api/oauth2/authorize?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=identify+guilds+guilds.members.read`;
    res.redirect(url);
};
