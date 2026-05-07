function getAdminConfig() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error("Loginul admin nu este configurat in Vercel.");
  }

  return {
    username,
    password
  };
}

function isAdmin(username, password) {
  const admin = getAdminConfig();

  return username === admin.username && password === admin.password;
}

module.exports = {
  isAdmin
};
