const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');
const crypto = require('crypto');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('❌ Method Not Allowed');
  }

  const bb = busboy({ headers: req.headers });

  let fileBuffer = Buffer.alloc(0);
  let fileName = '';
  let mimeType = '';
  const fields = {};

  bb.on('file', (name, file, info) => {
    const { filename, mimeType: type } = info;
    mimeType = type;
    const ext = filename.split('.').pop();
    fileName = crypto.randomUUID() + '.' + ext;

    file.on('data', (data) => {
      fileBuffer = Buffer.concat([fileBuffer, data]);
    });
  });

  bb.on('field', (name, val) => {
    fields[name] = val.trim();
  });

  bb.on('close', async () => {
    const { title, department } = fields;

    if (!title || !department || !fileBuffer.length) {
      return res.status(400).send('❌ Missing required fields or file');
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('ebooks') // 📁 Your Supabase bucket name
      .upload(`pdfs/${fileName}`, fileBuffer, {
        contentType: mimeType
      });

    if (uploadError) {
      return res.status(500).send("❌ Upload failed: " + uploadError.message);
    }

    const fileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/ebooks/pdfs/${fileName}`;

    // Insert into ebooks table
    const { error: insertErr } = await supabase
      .from('ebooks')
      .insert({
        title,
        department,
        url: fileUrl
      });

    if (insertErr) {
      return res.status(500).send("❌ Database insert error: " + insertErr.message);
    }

    return res.status(200).send("✅ eBook uploaded successfully!");
  });

  req.pipe(bb);
};
