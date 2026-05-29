/**
 * Database Seed Script
 * 
 * Resets all user passwords to known values and ensures seed data exists.
 * 
 * Usage: node scripts/seed.mjs
 * 
 * Login Credentials (all passwords follow {role}123 pattern):
 *   admin@canteen.com   / admin123
 *   manager@canteen.com / manager123
 *   staff@canteen.com   / staff123
 *   faculty@canteen.com / faculty123
 *   student@canteen.com / student123
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

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
  console.error('❌ Missing Supabase env vars in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Step 1: Check current state
  const { data: existingRoles } = await supabase.from('roles').select('name');
  if (!existingRoles || existingRoles.length === 0) {
    console.log('📦 Seeding roles...');
    const { error: rolesErr } = await supabase.from('roles').insert([
      { name: 'admin', description: 'Full system access and configuration' },
      { name: 'manager', description: 'Canteen operations and report management' },
      { name: 'staff', description: 'Canteen counter staff processing orders' },
      { name: 'faculty', description: 'Faculty members with meal credit access' },
      { name: 'student', description: 'Students with meal credit access' },
    ]);
    if (rolesErr) console.error('  ❌ Roles error:', rolesErr.message);
    else console.log('  ✅ Roles created');
  } else {
    console.log(`  ✅ Roles already exist (${existingRoles.length})`);
  }

  // Step 2: Reset user passwords and ensure users exist
  const usersToSeed = [
    { name: 'Admin User', email: 'admin@canteen.com', empId: 'ADM-0001', role: 'admin', credit: 0, password: 'admin123' },
    { name: 'Manager User', email: 'manager@canteen.com', empId: 'MGR-0001', role: 'manager', credit: 0, password: 'manager123' },
    { name: 'Staff User', email: 'staff@canteen.com', empId: 'STF-0001', role: 'staff', credit: 0, password: 'staff123' },
    { name: 'Faculty User', email: 'faculty@canteen.com', empId: 'FAC-0001', role: 'faculty', credit: 150, password: 'faculty123' },
    { name: 'Student User', email: 'student@canteen.com', empId: 'STU-0001', role: 'student', credit: 100, password: 'student123' },
  ];

  for (const u of usersToSeed) {
    // Get role ID
    const { data: role } = await supabase.from('roles').select('id').eq('name', u.role).single();
    if (!role) {
      console.error(`  ❌ Role "${u.role}" not found`);
      continue;
    }

    const passwordHash = await bcrypt.hash(u.password, 10);

    // Check if user exists
    const { data: existing } = await supabase.from('users').select('id').eq('email', u.email).single();

    if (existing) {
      // Update password and employee_id
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          name: u.name,
          monthly_credit_limit: u.credit,
          employee_id: u.empId,
        })
        .eq('id', existing.id);
      if (updateErr) console.error(`  ❌ ${u.email}: Update error - ${updateErr.message}`);
      else console.log(`  ✅ ${u.email}: Password reset to "${u.password}", Employee ID: ${u.empId}`);
    } else {
      // Create user
      const { error: insertErr } = await supabase.from('users').insert({
        name: u.name,
        email: u.email,
        password_hash: passwordHash,
        role_id: role.id,
        employee_id: u.empId,
        monthly_credit_limit: u.credit,
        active: true,
      });
      if (insertErr) console.error(`  ❌ ${u.email}: Insert error - ${insertErr.message}`);
      else console.log(`  ✅ ${u.email}: Created with password "${u.password}"`);
    }
  }

  console.log('\n📋 Login Credentials (use Employee ID + Password):');
  console.log('  ┌─────────────────────────┬──────────────┬──────────────┐');
  console.log('  │ Email                   │ Employee ID  │ Password     │');
  console.log('  ├─────────────────────────┼──────────────┤──────────────┤');
  usersToSeed.forEach(u => {
    const email = u.email.padEnd(23);
    const empId = u.empId.padEnd(12);
    console.log(`  │ ${email} │ ${empId} │ ${u.password.padEnd(12)} │`);
  });
  console.log('  └─────────────────────────┴──────────────┴──────────────┘');
  console.log('\n✅ Seed complete!');
}

main().catch(console.error);
