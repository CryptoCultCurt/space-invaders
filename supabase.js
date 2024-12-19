import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhjmdttihcqjokfixocp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoam1kdHRpaGNxam9rZml4b2NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2MzYwNzcsImV4cCI6MjA1MDIxMjA3N30._GGCsLog4X_LqpCF-jQOmNksPmtJhIujlNeND--IrJk';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getHighScores() {
    const { data, error } = await supabase
        .from('high_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error('Error fetching high scores:', error);
        return [];
    }
    return data;
}

export async function addHighScore(initials, score, level) {
    const { error } = await supabase
        .from('high_scores')
        .insert([{ initials, score, level }]);
    
    if (error) {
        console.error('Error adding high score:', error);
        return false;
    }
    return true;
}
