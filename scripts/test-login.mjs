import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      env[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
    }
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data: users, error } = await supabase.from('users').select('email, password_hash, name');
  if (error) {
    console.error('Error:', error);
    return;
  }

  const testPasswords = [
    'password', 'password123', 'admin', 'admin123', 'Password123', 'test123', 'abc123',
    '123456', '12345678', 'qwerty', 'letmein', 'welcome', 'monkey', 'dragon',
    'pass123', 'pass', 'canteen', 'canteen123', 'school', 'school123',
    'staff', 'staff123', 'manager', 'manager123', 'faculty', 'faculty123',
    'student', 'student123', 'user', 'user123', 'test', 'testing',
  ];
  
  for (const user of users) {
    console.log(`\nUser: ${user.name} (${user.email})`);
    let found = false;
    for (const pw of testPasswords) {
      const match = await bcrypt.compare(pw, user.password_hash);
      if (match) {
        console.log(`  ✅ Password found: "${pw}"`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`  ❌ No matching password in test list`);
      // Try to generate a fresh hash for this user
      const newHash = await bcrypt.hash('password123', 10);
      console.log(`  💡 New hash for "password123": ${newHash}`);
    }
  }
}

main().catch(console.error);
