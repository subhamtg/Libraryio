const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');
const { Readable } = require('stream');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send("❌ Method Not Allowed");
  }

  const bb = busboy({ headers: req.headers });
  const fields = {};
  let fileBuffer = Buffer.alloc(0);
  let filename = '';

  bb.on('field', (name, val) => {
    fields[name] = val.trim();
  });

  bb.on('file', (name, file, info) => {
    filename = info.filename;
    file.on('data', data => {
      fileBuffer = Buffer.concat([fileBuffer, data]);
    });
  });

  bb.on('close', async () => {
    const { title, description } = fields;

    if (!title || !filename || fileBuffer.length === 0) {
      return res.status(400).send("❌ Missing title or file");
    }

    // Upload to Supabase Storage
    const filePath = `ebooks/${Date.now()}_${filename}`;
    const { data: storageData, error: uploadError } = await supabase.storage
      .from('library')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf'
      });

    if (uploadError) {
      return res.status(500).send("❌ Storage upload error: " + uploadError.message);
    }

    const { data: publicURL } = supabase.storage
      .from('library')
      .getPublicUrl(filePath);

    // Save to Supabase Database (books table)
    const { error: insertErr } = await supabase
      .from('books')
      .insert([{ title, description, file_url: publicURL.publicUrl }]);

    if (insertErr) {
      return res.status(500).send("❌ DB insert error: " + insertErr.message);
    }

    res.status(200).send("✅ File uploaded successfully!");
  });

  req.pipe(bb);
};
