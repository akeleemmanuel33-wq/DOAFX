// js/supabase-client.js
// Replace with your actual project values (Supabase Dashboard -> Settings -> API)
const SUPABASE_URL = 'https://doeafkisqrteshcsaoze.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZWFma2lzcXJ0ZXNoY3Nhb3plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NTEwNDIsImV4cCI6MjEwMzIyNzA0Mn0.Xb1GOhXpS_5vPWfA0KhendfEa1-wPlShk_n7tFr8Hyg';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);