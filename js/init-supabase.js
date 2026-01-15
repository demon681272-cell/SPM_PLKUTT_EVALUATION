// Initialize Supabase Client
if (typeof supabase === 'undefined') {
    console.error("Supabase SDK not loaded! Please add the script tag to your HTML.");
} else {
    window.supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    console.log("✅ Supabase Connected");
}
