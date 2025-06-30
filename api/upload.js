const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send("Method Not Allowed");
  }

  const bb = busboy({ headers: req.headers });
  const fields = {};
  let fileBuffer = Buffer.alloc(0);
  let fileName = '';
  let mimeType = '';

  bb.on('file', (name, file, info) => {
    fileName = info.filename;
    mimeType = info.mimeType;

    file.on('data', (data) => {
      fileBuffer = Buffer.concat([fileBuffer, data]);
    });
  });

  bb.on('field', (name, val) => {
    fields[name] = val.trim();
  });

  bb.on('close', async () => {
    const { department, title } = fields;

    if (!department || !title || !fileName) {
      return res.status(400).send("❌ Missing fields");
    }

    const uniqueName = uuidv4() + "." + mime.extension(mimeType);

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('library')
      .upload(`pdfs/${uniqueName}`, fileBuffer, {
        contentType: mimeType
      });

    if (uploadErr) {
      return res.status(500).send("❌ Upload Failed: " + uploadErr.message);
    }

    // Insert metadata into Supabase table
    const publicUrl = supabase.storage
      .from('library')
      .getPublicUrl(`pdfs/${uniqueName}`).data.publicUrl;

    const { error: dbErr } = await supabase.from('pdfs').insert({
      title,
      department,
      url: publicUrl,
      file_name: fileName
    });

    if (dbErr) {
      return res.status(500).send("❌ DB Insert Failed: " + dbErr.message);
    }

    return res.status(200).send("✅ PDF uploaded successfully");
  });

  req.pipe(bb);
};
