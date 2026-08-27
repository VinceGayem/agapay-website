// ===== SUPABASE INIT =====
const SUPABASE_URL = 'https://rvqyqymeidraplaereaw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cXlxeW1laWRyYXBsYWVyZWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3OTM5NjIsImV4cCI6MjEwMzM2OTk2Mn0.LW-1MlABe7qM8eZG5AmAbE2Wu7QJP-nmldwjZ4Aew_E';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
