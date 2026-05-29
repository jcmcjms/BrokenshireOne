import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  // Check roles
  const { data: roles, error: rolesErr } = await supabase.from('roles').select('*');
  if (rolesErr) {
    console.error('Roles error:', rolesErr.message);
  } else {
    console.log(`Roles (${roles.length}):`);
    roles.forEach(r => console.log(`  - ${r.name}: ${r.description}`));
  }

  // Check users
  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  if (usersErr) {
    console.error('Users error:', usersErr.message);
  } else {
    console.log(`\nUsers (${users.length}):`);
    users.forEach(u => console.log(`  - ${u.email} (${u.name})`));
  }

  // Check menu categories
  const { data: categories } = await supabase.from('menu_categories').select('*');
  console.log(`\nMenu Categories (${categories?.length || 0}):`);
  categories?.forEach(c => console.log(`  - ${c.name}`));

  // Check menu items
  const { data: items } = await supabase.from('menu_items').select('*');
  console.log(`\nMenu Items (${items?.length || 0}):`);
  items?.forEach(i => console.log(`  - ${i.name} ($${i.price})`));
}

main().catch(console.error);
