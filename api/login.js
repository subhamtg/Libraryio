const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const bb = busboy({ headers: req.headers });
  const fields = {};

  bb.on('field', (name, val) => {
    fields[name] = val.trim();
  });

  bb.on('close', async () => {
    const { username, email, password } = fields;

    if (!username || !email || !password) {
      return res.status(400).send("❌ All fields required");
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('name, password')
        .eq('username', username)
        .eq('email', email)
        .single();

      if (error || !user) {
        return res.status(401).send("❌ Invalid credentials");
      }

      if (user.password !== password) {
        return res.status(401).send("❌ Incorrect password");
      }

      return res.status(200).send(`✅ Welcome ${user.name}`);
    } catch (err) {
      return res.status(500).send("❌ Server error: " + err.message);
    }
  });

  req.pipe(bb);
};
