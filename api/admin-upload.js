const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");

  const bb = busboy({ headers: req.headers });
  const fields = {};
  let fileBuffer = Buffer.alloc(0);
  let fileName = '';

  bb.on('file', (name, file, info) => {
    fileName = info.filename;
    file.on('data', data => {
      fileBuffer = Buffer.concat([fileBuffer, data]);
    });
  });

  bb.on('field', (name, val) => {
    fields[name] = val.trim();
  });

  bb.on('close', async () => {
    const { title, department } = fields;
    if (!title || !department || !fileName) {
      return res.status(400).send("❌ All fields required");
    }

    const { data, error } = await supabase.storage
      .from('ebooks')
      .upload(`books/${Date.now()}-${fileName}`, fileBuffer, {
        contentType: 'application/pdf',
      });

    if (error) return res.status(500).send("❌ Upload Failed: " + error.message);

    const { error: dbError } = await supabase
      .from('library')
      .insert([{ title, department, file_url: data.path }]);

    if (dbError) return res.status(500).send("❌ DB Insert Failed");

    res.status(200).send("✅ Upload successful");
  });

  req.pipe(bb);
};
