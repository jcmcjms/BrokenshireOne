import { db } from '@/lib/supabase/helpers';
import type {
  DbLibraryBook,
  DbLibraryBorrowing,
  DbLibraryFine,
  DbLibraryMember,
  DbLibraryReservation,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Book queries
// ---------------------------------------------------------------------------

export async function getLibraryBooks(
  search?: string,
  category?: string,
): Promise<DbLibraryBook[]> {
  let query = db('library_books').select('*');

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,author.ilike.%${search}%,isbn.ilike.%${search}%`,
    );
  }
  if (category) {
    query = query.eq('category', category);
  }

  query = query.order('title', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbLibraryBook[];
}

export async function getLibraryBookById(
  id: string,
): Promise<DbLibraryBook | null> {
  const { data, error } = await db('library_books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as DbLibraryBook | null;
}

export async function createLibraryBook(data: {
  title: string;
  author: string;
  isbn?: string | null;
  publisher?: string | null;
  published_year?: number | null;
  category?: string;
  description?: string | null;
  cover_image_url?: string | null;
  total_copies?: number;
  shelf_location?: string | null;
}): Promise<DbLibraryBook> {
  const { data: record, error } = await db('library_books')
    .insert({
      title: data.title,
      author: data.author,
      isbn: data.isbn ?? null,
      publisher: data.publisher ?? null,
      published_year: data.published_year ?? null,
      category: data.category ?? 'fiction',
      description: data.description ?? null,
      cover_image_url: data.cover_image_url ?? null,
      total_copies: data.total_copies ?? 1,
      available_copies: data.total_copies ?? 1,
      shelf_location: data.shelf_location ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbLibraryBook;
}

export async function updateLibraryBook(
  id: string,
  updates: Partial<{
    title: string;
    author: string;
    isbn: string | null;
    publisher: string | null;
    published_year: number | null;
    category: string;
    description: string | null;
    cover_image_url: string | null;
    total_copies: number;
    available_copies: number;
    shelf_location: string | null;
  }>,
): Promise<DbLibraryBook> {
  const { data, error } = await db('library_books')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbLibraryBook;
}

export async function deleteLibraryBook(id: string): Promise<void> {
  const { error } = await db('library_books').delete().eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Borrowing queries
// ---------------------------------------------------------------------------

export async function getBorrowings(
  memberId?: string,
  status?: string,
): Promise<DbLibraryBorrowing[]> {
  let query = db('library_borrowings')
    .select('*, library_books(title, author), processor:users!processed_by(name)');

  if (memberId) {
    query = query.eq('member_id', memberId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('borrowed_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbLibraryBorrowing[];
}

export async function getBorrowingById(
  id: string,
): Promise<DbLibraryBorrowing | null> {
  const { data, error } = await db('library_borrowings')
    .select('*, library_books(title, author), processor:users!processed_by(name)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as DbLibraryBorrowing | null;
}

export async function createBorrowing(data: {
  member_id: string;
  book_id: string;
  due_at: string;
  processed_by: string;
}): Promise<DbLibraryBorrowing> {
  const { data: record, error } = await db('library_borrowings')
    .insert({
      member_id: data.member_id,
      book_id: data.book_id,
      due_at: data.due_at,
      processed_by: data.processed_by,
      status: 'active',
      renewed_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return record as unknown as DbLibraryBorrowing;
}

export async function returnBook(
  borrowingId: string,
  returnedAt: string,
): Promise<DbLibraryBorrowing> {
  const { data, error } = await db('library_borrowings')
    .update({
      returned_at: returnedAt,
      status: 'returned',
    })
    .eq('id', borrowingId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbLibraryBorrowing;
}

export async function renewBorrowing(
  borrowingId: string,
  newDueAt: string,
  renewedCount: number,
): Promise<DbLibraryBorrowing> {
  const { data, error } = await db('library_borrowings')
    .update({
      due_at: newDueAt,
      renewed_count: renewedCount,
      status: 'active',
    })
    .eq('id', borrowingId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbLibraryBorrowing;
}

export async function markBorrowingLost(
  borrowingId: string,
): Promise<DbLibraryBorrowing> {
  const { data, error } = await db('library_borrowings')
    .update({ status: 'lost' })
    .eq('id', borrowingId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbLibraryBorrowing;
}

// ---------------------------------------------------------------------------
// Member queries
// ---------------------------------------------------------------------------

export async function getLibraryMembers(
  search?: string,
): Promise<DbLibraryMember[]> {
  let query = db('library_members')
    .select('*, users(name, email)')
    .order('joined_at', { ascending: false });

  if (search) {
    query = query.or(
      `users.name.ilike.%${search}%,users.email.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbLibraryMember[];
}

export async function getLibraryMemberById(
  id: string,
): Promise<DbLibraryMember | null> {
  const { data, error } = await db('library_members')
    .select('*, users(name, email)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data as DbLibraryMember | null;
}

export async function createLibraryMember(data: {
  user_id: string;
  membership_type: 'student' | 'faculty' | 'staff';
  max_books_allowed?: number;
  borrow_duration_days?: number;
}): Promise<DbLibraryMember> {
  const maxBooks: Record<string, number> = {
    student: 3,
    faculty: 5,
    staff: 5,
  };
  const borrowDays: Record<string, number> = {
    student: 7,
    faculty: 14,
    staff: 14,
  };

  const { data: record, error } = await db('library_members')
    .insert({
      user_id: data.user_id,
      membership_type: data.membership_type,
      max_books_allowed: data.max_books_allowed ?? maxBooks[data.membership_type] ?? 3,
      borrow_duration_days: data.borrow_duration_days ?? borrowDays[data.membership_type] ?? 7,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return record as unknown as DbLibraryMember;
}

export async function updateLibraryMember(
  id: string,
  updates: Partial<{
    membership_type: 'student' | 'faculty' | 'staff';
    max_books_allowed: number;
    borrow_duration_days: number;
    is_active: boolean;
  }>,
): Promise<DbLibraryMember> {
  const { data, error } = await db('library_members')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbLibraryMember;
}

// ---------------------------------------------------------------------------
// Reservation queries
// ---------------------------------------------------------------------------

export async function getReservations(
  memberId?: string,
  status?: string,
): Promise<DbLibraryReservation[]> {
  let query = db('library_reservations')
    .select('*, library_books(title, author)');

  if (memberId) {
    query = query.eq('member_id', memberId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('reserved_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbLibraryReservation[];
}

export async function createReservation(data: {
  member_id: string;
  book_id: string;
  expires_at: string;
}): Promise<DbLibraryReservation> {
  const { data: record, error } = await db('library_reservations')
    .insert({
      member_id: data.member_id,
      book_id: data.book_id,
      expires_at: data.expires_at,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return record as unknown as DbLibraryReservation;
}

export async function cancelReservation(
  reservationId: string,
): Promise<void> {
  const { error } = await db('library_reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId);

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Fine queries
// ---------------------------------------------------------------------------

export async function getFines(
  memberId?: string,
  status?: string,
): Promise<DbLibraryFine[]> {
  let query = db('library_fines')
    .select('*, library_members!member_id(membership_type)');

  if (memberId) {
    query = query.eq('member_id', memberId);
  }
  if (status) {
    query = query.eq('status', status);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DbLibraryFine[];
}

export async function payFine(fineId: string): Promise<DbLibraryFine> {
  const { data, error } = await db('library_fines')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', fineId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbLibraryFine;
}

export async function waiveFine(
  fineId: string,
  waivedBy: string,
): Promise<DbLibraryFine> {
  const { data, error } = await db('library_fines')
    .update({
      status: 'waived',
      waived_by: waivedBy,
    })
    .eq('id', fineId)
    .select()
    .single();

  if (error) throw error;
  return data as unknown as DbLibraryFine;
}
