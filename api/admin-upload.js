const { createClient } = require('@supabase/supabase-js');
const busboy = require('busboy');
const { randomUUID } = require('crypto');

// Initialize Supabase
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
  let fileBuffer = Buffer.alloc(0);
  let fileName = '';

  bb.on('file', (name, file, info) => {
    const ext = info.filename.split('.').pop();
    fileName = `${randomUUID()}.${ext}`;
    file.on('data', (data) => {
      fileBuffer = Buffer.concat([fileBuffer, data]);
    });
  });

  bb.on('field', (name, val) => {
    fields[name] = val.trim();
  });

  bb.on('close', async () => {
    const { title, description } = fields;

    if (!title || !fileBuffer.length) {
      return res.status(400).send('❌ Missing title or file');
    }

    // Upload file to Supabase Storage
    const { data: fileData, error: uploadError } = await supabase.storage
      .from('ebooks')
      .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).send('❌ Upload error: ' + uploadError.message);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('ebooks')
      .getPublicUrl(fileData.path);

    const fileUrl = publicUrlData.publicUrl;

    // Save metadata to books table
    const { error: insertError } = await supabase.from('books').insert([
      {
        title,
        description,
        file_url: fileUrl,
      },
    ]);

    if (insertError) {
      return res.status(500).send('❌ Failed to save book data: ' + insertError.message);
    }

    res.status(200).send('✅ Book uploaded successfully!');
  });

  req.pipe(bb);
};
