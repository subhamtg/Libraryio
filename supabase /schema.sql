-- 📁 Users Table (for Sign Up / Login)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 📚 PDFs Table (Uploaded PDFs)
CREATE TABLE pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  url TEXT NOT NULL,         -- Public or signed download URL
  file_name TEXT,            -- Original uploaded file name
  uploaded_by UUID,          -- Foreign key to users.id (optional)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 🏫 Departments Table (Optional for Listing)
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- 🌐 Example: Insert Common Departments
INSERT INTO departments (name) VALUES 
('Computer Science'),
('Mathematics'),
('Physics'),
('Chemistry'),
('Biology'),
('Commerce'),
('Arts'),
('History');
